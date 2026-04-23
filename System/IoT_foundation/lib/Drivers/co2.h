/***********************************************
 * co2.h
 *  MH-Z19B CO2 sensor interface
 *
 *  Author:  SEP4 Team
 *  Date:    2026-04-23
 *  Project: SPE4_API
 **********************************************/
#pragma once

#include <stdbool.h>
#include <stdint.h>

typedef enum {
    CO2_OK = 0,
    CO2_FAIL = -1,
    CO2_INVALID_ARG = -2,
    CO2_INVALID_CHECKSUM = -3,
    CO2_TIMEOUT = -4,
    CO2_NOT_INITIALIZED = -5
} co2_status_t;

// Initialize MH-Z19B driver on the selected UART.
// Uses 9600 baud and enables a small RX ring buffer.
co2_status_t co2_init(uint8_t uart_id);

// Read current CO2 concentration in PPM from MH-Z19B.
co2_status_t co2_read_ppm(uint16_t *ppm);

// Enable/disable Auto Baseline Calibration (ABC).
co2_status_t co2_set_abc(bool enabled);

// Zero-point calibration (sensor must be in fresh air ~400 ppm).
co2_status_t co2_zero_calibration(void);

// Span calibration with known concentration in ppm (1000-5000 typical).
co2_status_t co2_span_calibration(uint16_t span_ppm);
