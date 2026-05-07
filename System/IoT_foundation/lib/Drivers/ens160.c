/***********************************************
 * ens160.c
 *  ScioSense ENS160 air-quality sensor implementation.
 *
 *  Author:  SEP4 Team
 *  Date:    2026-05-07
 *  Project: SPE4_API
 **********************************************/
#include "ens160.h"
#include "i2c.h"

#include <stddef.h>

#if defined(__has_include)
#if __has_include(<util/delay.h>)
#include <util/delay.h>
#define ENS160_HAVE_DELAY_HEADER 1
#endif
#endif

#ifndef ENS160_HAVE_DELAY_HEADER
#define ENS160_HAVE_DELAY_HEADER 0
#endif

/* ENS160 register map (subset). */
#define ENS160_REG_PART_ID        0x00U
#define ENS160_REG_OPMODE         0x10U
#define ENS160_REG_CONFIG         0x11U
#define ENS160_REG_COMMAND        0x12U
#define ENS160_REG_TEMP_IN        0x13U
#define ENS160_REG_RH_IN          0x15U
#define ENS160_REG_DEVICE_STATUS  0x20U
#define ENS160_REG_DATA_AQI       0x21U
#define ENS160_REG_DATA_TVOC      0x22U
#define ENS160_REG_DATA_ECO2      0x24U

/* OPMODE values. */
#define ENS160_OPMODE_DEEP_SLEEP  0x00U
#define ENS160_OPMODE_IDLE        0x01U
#define ENS160_OPMODE_STANDARD    0x02U
#define ENS160_OPMODE_RESET       0xF0U

/* DEVICE_STATUS bits we care about. */
#define ENS160_STATUS_NEWDAT      (1U << 1)
#define ENS160_STATUS_VALID_MASK  (3U << 2)
#define ENS160_STATUS_VALID_NORMAL (0U << 2)
#define ENS160_STATUS_VALID_WARMUP (1U << 2)
#define ENS160_STATUS_VALID_INITIAL (2U << 2)

static uint8_t ens160_address = ENS160_I2C_ADDR_DEFAULT;
static uint8_t ens160_initialised = 0U;

static void ens160_delay_ms(uint16_t ms)
{
#if ENS160_HAVE_DELAY_HEADER
    while (ms-- > 0U)
    {
        _delay_ms(1.0);
    }
#else
    /* Fallback busy-loop. Calibrated for 16 MHz; precision is unimportant
     * because the only callers wait for sensor wake-up, not bus timing. */
    volatile uint32_t i;
    for (uint16_t m = 0U; m < ms; m++)
    {
        for (i = 0U; i < 2000UL; i++) { }
    }
#endif
}

static ens160_status_t ens160_write_reg(uint8_t reg, const uint8_t *data, uint8_t length)
{
    uint8_t buffer[6];
    if (length >= sizeof(buffer))
    {
        return ENS160_INVALID_ARG;
    }
    buffer[0] = reg;
    for (uint8_t i = 0U; i < length; i++)
    {
        buffer[i + 1U] = data[i];
    }
    if (i2c_write(ens160_address, buffer, (uint8_t)(length + 1U)) != I2C_OK)
    {
        return ENS160_I2C_ERROR;
    }
    return ENS160_OK;
}

static ens160_status_t ens160_read_reg(uint8_t reg, uint8_t *data, uint8_t length)
{
    if (i2c_write_then_read(ens160_address, &reg, 1U, data, length) != I2C_OK)
    {
        return ENS160_I2C_ERROR;
    }
    return ENS160_OK;
}

static ens160_status_t ens160_set_opmode(uint8_t mode)
{
    return ens160_write_reg(ENS160_REG_OPMODE, &mode, 1U);
}

ens160_status_t ens160_init(uint8_t i2c_address)
{
    uint8_t part_bytes[2] = {0};
    uint16_t part_id = 0U;
    ens160_status_t status;

    ens160_address = i2c_address;
    ens160_initialised = 0U;

    /* Software reset. The chip needs a brief settling delay afterwards. */
    status = ens160_set_opmode(ENS160_OPMODE_RESET);
    if (status != ENS160_OK)
    {
        return status;
    }
    ens160_delay_ms(10);

    /* Move out of reset so that the part-ID register is readable. */
    status = ens160_set_opmode(ENS160_OPMODE_IDLE);
    if (status != ENS160_OK)
    {
        return status;
    }
    ens160_delay_ms(10);

    status = ens160_read_reg(ENS160_REG_PART_ID, part_bytes, 2U);
    if (status != ENS160_OK)
    {
        return status;
    }
    part_id = (uint16_t)((uint16_t)part_bytes[1] << 8U) | (uint16_t)part_bytes[0];
    if (part_id != ENS160_PART_ID)
    {
        return ENS160_BAD_PART_ID;
    }

    /* Standard gas-sensing mode -> tVOC / eCO2 / AQI registers begin updating. */
    status = ens160_set_opmode(ENS160_OPMODE_STANDARD);
    if (status != ENS160_OK)
    {
        return status;
    }
    ens160_delay_ms(20);

    ens160_initialised = 1U;
    return ENS160_OK;
}

ens160_status_t ens160_set_compensation(float temperature_c, float humidity_percent)
{
    uint8_t payload[4];
    uint16_t temp_raw;
    uint16_t rh_raw;

    if (!ens160_initialised)
    {
        return ENS160_NOT_INITIALIZED;
    }

    if (humidity_percent < 0.0f) { humidity_percent = 0.0f; }
    if (humidity_percent > 100.0f) { humidity_percent = 100.0f; }

    /* TEMP_IN: Kelvin * 64. RH_IN: % * 512. Both little-endian. */
    float kelvin = temperature_c + 273.15f;
    if (kelvin < 0.0f) { kelvin = 0.0f; }
    temp_raw = (uint16_t)(kelvin * 64.0f);
    rh_raw = (uint16_t)(humidity_percent * 512.0f);

    payload[0] = (uint8_t)(temp_raw & 0xFFU);
    payload[1] = (uint8_t)((temp_raw >> 8U) & 0xFFU);
    payload[2] = (uint8_t)(rh_raw & 0xFFU);
    payload[3] = (uint8_t)((rh_raw >> 8U) & 0xFFU);

    /* TEMP_IN and RH_IN are consecutive registers, so a single 4-byte
     * write covers both. */
    return ens160_write_reg(ENS160_REG_TEMP_IN, payload, 4U);
}

ens160_status_t ens160_read(uint16_t *eco2_ppm, uint16_t *tvoc_ppb, uint8_t *aqi)
{
    uint8_t status_reg = 0U;
    uint8_t block[5] = {0};
    ens160_status_t status;

    if (!ens160_initialised)
    {
        return ENS160_NOT_INITIALIZED;
    }

    status = ens160_read_reg(ENS160_REG_DEVICE_STATUS, &status_reg, 1U);
    if (status != ENS160_OK)
    {
        return status;
    }

    /* Read AQI (1 byte), TVOC (2 bytes), eCO2 (2 bytes) as one 5-byte burst. */
    status = ens160_read_reg(ENS160_REG_DATA_AQI, block, 5U);
    if (status != ENS160_OK)
    {
        return status;
    }

    if (aqi != NULL)
    {
        *aqi = (uint8_t)(block[0] & 0x07U);
    }
    if (tvoc_ppb != NULL)
    {
        *tvoc_ppb = (uint16_t)((uint16_t)block[2] << 8U) | (uint16_t)block[1];
    }
    if (eco2_ppm != NULL)
    {
        *eco2_ppm = (uint16_t)((uint16_t)block[4] << 8U) | (uint16_t)block[3];
    }

    /* During warm-up / initial start-up the sensor reports values but
     * flags them as not-yet-stable. Surface that to the caller. */
    uint8_t valid = (uint8_t)(status_reg & ENS160_STATUS_VALID_MASK);
    if ((valid == ENS160_STATUS_VALID_WARMUP) || (valid == ENS160_STATUS_VALID_INITIAL))
    {
        return ENS160_NOT_READY;
    }

    return ENS160_OK;
}

uint8_t ens160_is_ready(void)
{
    return ens160_initialised;
}
