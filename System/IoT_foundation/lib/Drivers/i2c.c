/***********************************************
 * i2c.c
 *  Hardware TWI (I2C) master driver for ATmega2560
 *
 *  Author:  SEP4 Team
 *  Date:    2026-05-07
 *  Project: SPE4_API
 **********************************************/
#include "i2c.h"

#include <avr/io.h>
#include <stddef.h>

#ifndef F_CPU
#define F_CPU 16000000UL
#endif

/* Spin-loop bound for waiting on TWINT. The ATmega2560 datasheet describes
 * each TWI byte as "a few SCL cycles", so even at 100 kHz a transfer completes
 * in well under 1 ms. We use a generous CPU-cycle counter rather than a time
 * delay to avoid pulling in <util/delay.h> here. */
#define I2C_TWINT_TIMEOUT_LOOPS 200000UL

/* TWSR status codes that we care about. Mask out the prescaler bits before
 * comparing. */
#define TWSR_STATUS_MASK    0xF8U
#define TW_START            0x08U
#define TW_REP_START        0x10U
#define TW_MT_SLA_ACK       0x18U
#define TW_MT_SLA_NACK      0x20U
#define TW_MT_DATA_ACK      0x28U
#define TW_MT_DATA_NACK     0x30U
#define TW_MR_SLA_ACK       0x40U
#define TW_MR_SLA_NACK      0x48U
#define TW_MR_DATA_ACK      0x50U
#define TW_MR_DATA_NACK     0x58U

static uint8_t i2c_initialised = 0U;

static i2c_status_t twi_wait(void)
{
    uint32_t loops = 0U;
    while ((TWCR & (1U << TWINT)) == 0U)
    {
        if (++loops >= I2C_TWINT_TIMEOUT_LOOPS)
        {
            return I2C_TIMEOUT;
        }
    }
    return I2C_OK;
}

static i2c_status_t twi_start(void)
{
    TWCR = (1U << TWINT) | (1U << TWSTA) | (1U << TWEN);
    if (twi_wait() != I2C_OK)
    {
        return I2C_TIMEOUT;
    }
    uint8_t status = TWSR & TWSR_STATUS_MASK;
    if ((status != TW_START) && (status != TW_REP_START))
    {
        return I2C_FAIL;
    }
    return I2C_OK;
}

static void twi_stop(void)
{
    TWCR = (1U << TWINT) | (1U << TWSTO) | (1U << TWEN);
    /* The TWSTO bit clears itself when the STOP condition is on the bus.
     * Spin (bounded) so the next transfer sees an idle bus. */
    uint32_t loops = 0U;
    while ((TWCR & (1U << TWSTO)) != 0U)
    {
        if (++loops >= I2C_TWINT_TIMEOUT_LOOPS)
        {
            break;
        }
    }
}

static i2c_status_t twi_write_byte(uint8_t value, uint8_t expected_status)
{
    TWDR = value;
    TWCR = (1U << TWINT) | (1U << TWEN);
    if (twi_wait() != I2C_OK)
    {
        return I2C_TIMEOUT;
    }
    uint8_t status = TWSR & TWSR_STATUS_MASK;
    if (status == expected_status)
    {
        return I2C_OK;
    }
    if ((status == TW_MT_SLA_NACK) || (status == TW_MT_DATA_NACK))
    {
        return I2C_NACK;
    }
    return I2C_FAIL;
}

static i2c_status_t twi_read_byte(uint8_t *out, uint8_t send_ack)
{
    TWCR = (uint8_t)((1U << TWINT) | (1U << TWEN) | (send_ack ? (1U << TWEA) : 0U));
    if (twi_wait() != I2C_OK)
    {
        return I2C_TIMEOUT;
    }
    uint8_t status = TWSR & TWSR_STATUS_MASK;
    uint8_t expected = send_ack ? TW_MR_DATA_ACK : TW_MR_DATA_NACK;
    if (status != expected)
    {
        return I2C_FAIL;
    }
    *out = TWDR;
    return I2C_OK;
}

void i2c_init(uint32_t scl_hz)
{
    /* Clamp to a safe range. Most I2C devices accept 100 kHz; the ENS160 supports up to 400 kHz. */
    if (scl_hz < 10000UL)
    {
        scl_hz = 10000UL;
    }
    if (scl_hz > 400000UL)
    {
        scl_hz = 400000UL;
    }

    /* SCL frequency = F_CPU / (16 + 2 * TWBR * prescaler). Use prescaler = 1. */
    TWSR = 0x00U;
    uint32_t twbr = ((F_CPU / scl_hz) - 16UL) / 2UL;
    if (twbr > 255UL)
    {
        twbr = 255UL;
    }
    TWBR = (uint8_t)twbr;

    /* Enable TWI; pull-ups are expected to be provided externally on SDA/SCL. */
    TWCR = (1U << TWEN);
    i2c_initialised = 1U;
}

i2c_status_t i2c_write(uint8_t addr7, const uint8_t *data, uint8_t length)
{
    i2c_status_t result;

    if (!i2c_initialised)
    {
        return I2C_FAIL;
    }
    if ((data == NULL) || (length == 0U))
    {
        return I2C_INVALID_ARG;
    }

    result = twi_start();
    if (result != I2C_OK)
    {
        twi_stop();
        return result;
    }

    result = twi_write_byte((uint8_t)((addr7 << 1U) & 0xFEU), TW_MT_SLA_ACK);
    if (result != I2C_OK)
    {
        twi_stop();
        return result;
    }

    for (uint8_t i = 0U; i < length; i++)
    {
        result = twi_write_byte(data[i], TW_MT_DATA_ACK);
        if (result != I2C_OK)
        {
            twi_stop();
            return result;
        }
    }

    twi_stop();
    return I2C_OK;
}

i2c_status_t i2c_read(uint8_t addr7, uint8_t *data, uint8_t length)
{
    i2c_status_t result;

    if (!i2c_initialised)
    {
        return I2C_FAIL;
    }
    if ((data == NULL) || (length == 0U))
    {
        return I2C_INVALID_ARG;
    }

    result = twi_start();
    if (result != I2C_OK)
    {
        twi_stop();
        return result;
    }

    /* SLA+R. The expected ACK status differs from the write path. */
    TWDR = (uint8_t)((addr7 << 1U) | 0x01U);
    TWCR = (1U << TWINT) | (1U << TWEN);
    if (twi_wait() != I2C_OK)
    {
        twi_stop();
        return I2C_TIMEOUT;
    }
    uint8_t status = TWSR & TWSR_STATUS_MASK;
    if (status == TW_MR_SLA_NACK)
    {
        twi_stop();
        return I2C_NACK;
    }
    if (status != TW_MR_SLA_ACK)
    {
        twi_stop();
        return I2C_FAIL;
    }

    for (uint8_t i = 0U; i < length; i++)
    {
        uint8_t send_ack = (uint8_t)((i < (length - 1U)) ? 1U : 0U);
        result = twi_read_byte(&data[i], send_ack);
        if (result != I2C_OK)
        {
            twi_stop();
            return result;
        }
    }

    twi_stop();
    return I2C_OK;
}

i2c_status_t i2c_write_then_read(uint8_t addr7,
                                 const uint8_t *write_data, uint8_t write_length,
                                 uint8_t *read_data, uint8_t read_length)
{
    i2c_status_t result;

    if (!i2c_initialised)
    {
        return I2C_FAIL;
    }
    if ((write_data == NULL) || (read_data == NULL) ||
        (write_length == 0U) || (read_length == 0U))
    {
        return I2C_INVALID_ARG;
    }

    /* Phase 1: START + SLA+W + write_data (no STOP). */
    result = twi_start();
    if (result != I2C_OK)
    {
        twi_stop();
        return result;
    }

    result = twi_write_byte((uint8_t)((addr7 << 1U) & 0xFEU), TW_MT_SLA_ACK);
    if (result != I2C_OK)
    {
        twi_stop();
        return result;
    }

    for (uint8_t i = 0U; i < write_length; i++)
    {
        result = twi_write_byte(write_data[i], TW_MT_DATA_ACK);
        if (result != I2C_OK)
        {
            twi_stop();
            return result;
        }
    }

    /* Phase 2: repeated START + SLA+R + read_data + STOP. */
    result = twi_start();
    if (result != I2C_OK)
    {
        twi_stop();
        return result;
    }

    TWDR = (uint8_t)((addr7 << 1U) | 0x01U);
    TWCR = (1U << TWINT) | (1U << TWEN);
    if (twi_wait() != I2C_OK)
    {
        twi_stop();
        return I2C_TIMEOUT;
    }
    uint8_t status = TWSR & TWSR_STATUS_MASK;
    if (status == TW_MR_SLA_NACK)
    {
        twi_stop();
        return I2C_NACK;
    }
    if (status != TW_MR_SLA_ACK)
    {
        twi_stop();
        return I2C_FAIL;
    }

    for (uint8_t i = 0U; i < read_length; i++)
    {
        uint8_t send_ack = (uint8_t)((i < (read_length - 1U)) ? 1U : 0U);
        result = twi_read_byte(&read_data[i], send_ack);
        if (result != I2C_OK)
        {
            twi_stop();
            return result;
        }
    }

    twi_stop();
    return I2C_OK;
}
