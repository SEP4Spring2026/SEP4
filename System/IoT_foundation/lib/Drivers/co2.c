/***********************************************
 * co2.c
 *  MH-Z19B CO2 sensor implementation
 *
 *  Author:  SEP4 Team
 *  Date:    2026-04-23
 *  Project: SPE4_API
 **********************************************/
#include "co2.h"
#include <stddef.h>

typedef enum {
    UART_OK = 0,
    UART_ERROR_INVALID_BAUD_RATE = -1,
    UART_ERROR_INIT_FAILED = -2,
    UART_ERROR_INVALID_ID = -3,
    UART_NO_DATA_AVAILABLE = -4
} uart_t;

typedef enum {
    UART0_ID = 0,
    UART1_ID = 1,
    UART2_ID = 2,
    UART3_ID = 3
} uart_id_t;

typedef void (*rx_callback_t)(uint8_t byte);

uart_t uart_init(uart_id_t uart_id, uint32_t baud_rate, rx_callback_t rx_callback, uint8_t buffer_size);
uart_t uart_write_bytes(uart_id_t uart_id, uint8_t *data, uint8_t length);
uart_t uart_read_byte(uart_id_t uart_id, uint8_t *byte);

#define MHZ19B_BAUD_RATE              9600U
#define MHZ19B_UART_RX_BUFFER_SIZE    32U
#define MHZ19B_FRAME_SIZE             9U
#define MHZ19B_RESPONSE_TIMEOUT_CYCLES 50000U
#define MHZ19B_CMD_PREFIX             0xFFU
#define MHZ19B_CMD_SENSOR             0x01U

// MH-Z19B commands
#define MHZ19B_CMD_READ_CO2           0x86U
#define MHZ19B_CMD_ZERO_CALIBRATION   0x87U
#define MHZ19B_CMD_SPAN_CALIBRATION   0x88U
#define MHZ19B_CMD_SET_ABC            0x79U

static bool co2_initialized = false;
static uart_id_t co2_uart_id = UART1_ID;

static uint8_t mhz19b_checksum(const uint8_t *frame)
{
    uint8_t sum = 0;
    for (uint8_t i = 1; i < 8; i++)
    {
        sum = (uint8_t)(sum + frame[i]);
    }
    return (uint8_t)(0xFFU - sum + 1U);
}

static co2_status_t mhz19b_send_command(uint8_t command, uint8_t b3, uint8_t b4, uint8_t b5, uint8_t b6, uint8_t b7)
{
    uint8_t frame[MHZ19B_FRAME_SIZE] = {
        MHZ19B_CMD_PREFIX,
        MHZ19B_CMD_SENSOR,
        command,
        b3,
        b4,
        b5,
        b6,
        b7,
        0
    };
    frame[8] = mhz19b_checksum(frame);

    if (uart_write_bytes(co2_uart_id, frame, MHZ19B_FRAME_SIZE) != UART_OK)
    {
        return CO2_FAIL;
    }

    return CO2_OK;
}

static void mhz19b_flush_rx(void)
{
    uint8_t dummy = 0;
    while (uart_read_byte(co2_uart_id, &dummy) == UART_OK)
    {
        // Discard stale bytes.
    }
}

static co2_status_t mhz19b_read_response(uint8_t *response)
{
    uint8_t byte = 0;
    uint32_t retries = 0;
    uint8_t index = 0;

    if (response == NULL)
    {
        return CO2_INVALID_ARG;
    }

    while ((retries < MHZ19B_RESPONSE_TIMEOUT_CYCLES) && (index < MHZ19B_FRAME_SIZE))
    {
        if (uart_read_byte(co2_uart_id, &byte) == UART_OK)
        {
            response[index++] = byte;
            continue;
        }
        retries++;
    }

    if (index < MHZ19B_FRAME_SIZE)
    {
        return CO2_TIMEOUT;
    }

    if ((response[0] != MHZ19B_CMD_PREFIX) || (response[1] != MHZ19B_CMD_READ_CO2))
    {
        return CO2_FAIL;
    }

    if (mhz19b_checksum(response) != response[8])
    {
        return CO2_INVALID_CHECKSUM;
    }

    return CO2_OK;
}

co2_status_t co2_init(uint8_t uart_id)
{
    if (uart_init((uart_id_t)uart_id, MHZ19B_BAUD_RATE, NULL, MHZ19B_UART_RX_BUFFER_SIZE) != UART_OK)
    {
        return CO2_FAIL;
    }

    co2_uart_id = (uart_id_t)uart_id;
    co2_initialized = true;
    mhz19b_flush_rx();
    return CO2_OK;
}

co2_status_t co2_read_ppm(uint16_t *ppm)
{
    uint8_t response[MHZ19B_FRAME_SIZE] = {0};
    co2_status_t status;

    if (!co2_initialized)
    {
        return CO2_NOT_INITIALIZED;
    }

    if (ppm == NULL)
    {
        return CO2_INVALID_ARG;
    }

    mhz19b_flush_rx();
    status = mhz19b_send_command(MHZ19B_CMD_READ_CO2, 0, 0, 0, 0, 0);
    if (status != CO2_OK)
    {
        return status;
    }

    status = mhz19b_read_response(response);
    if (status != CO2_OK)
    {
        return status;
    }

    *ppm = (uint16_t)(((uint16_t)response[2] << 8U) | response[3]);
    return CO2_OK;
}

co2_status_t co2_set_abc(bool enabled)
{
    if (!co2_initialized)
    {
        return CO2_NOT_INITIALIZED;
    }

    // Datasheet convention: 0xA0 enables ABC, 0x00 disables.
    return mhz19b_send_command(MHZ19B_CMD_SET_ABC, enabled ? 0xA0U : 0x00U, 0, 0, 0, 0);
}

co2_status_t co2_zero_calibration(void)
{
    if (!co2_initialized)
    {
        return CO2_NOT_INITIALIZED;
    }
    return mhz19b_send_command(MHZ19B_CMD_ZERO_CALIBRATION, 0, 0, 0, 0, 0);
}

co2_status_t co2_span_calibration(uint16_t span_ppm)
{
    if (!co2_initialized)
    {
        return CO2_NOT_INITIALIZED;
    }
    if (span_ppm < 1000U || span_ppm > 5000U)
    {
        return CO2_INVALID_ARG;
    }
    return mhz19b_send_command(
        MHZ19B_CMD_SPAN_CALIBRATION,
        (uint8_t)((span_ppm >> 8U) & 0xFFU),
        (uint8_t)(span_ppm & 0xFFU),
        0,
        0,
        0
    );
}
