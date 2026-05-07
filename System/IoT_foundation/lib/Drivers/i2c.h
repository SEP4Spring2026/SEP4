/***********************************************
 * i2c.h
 *  Hardware TWI (I2C) master driver for ATmega2560
 *
 *  Author:  SEP4 Team
 *  Date:    2026-05-07
 *  Project: SPE4_API
 *
 *  Bus pins on Arduino Mega 2560:
 *      SDA = PD1 (Arduino pin 20)
 *      SCL = PD0 (Arduino pin 21)
 *
 *  This driver is intentionally minimal and blocking, mirroring
 *  the style of the existing UART/CO2/DHT11 drivers. It is
 *  sufficient for low-rate sensors such as the ENS160.
 **********************************************/
#pragma once

#include <stdint.h>

typedef enum {
    I2C_OK = 0,
    I2C_FAIL = -1,         /**< Bus error or unexpected TWSR status. */
    I2C_NACK = -2,         /**< Slave did not acknowledge address or data byte. */
    I2C_TIMEOUT = -3,      /**< Hardware did not signal completion in time. */
    I2C_INVALID_ARG = -4   /**< NULL pointer or zero-length transfer. */
} i2c_status_t;

/**
 * @brief Initialise the TWI peripheral as an I2C master.
 *
 * @param scl_hz Desired SCL clock in Hz (e.g. 100000 or 400000).
 *               Values are clamped to a sensible range. F_CPU must be defined.
 */
void i2c_init(uint32_t scl_hz);

/**
 * @brief Write @p length bytes to the 7-bit slave address @p addr7.
 *
 * Issues START, SLA+W, the bytes, and STOP. Returns on the first NACK.
 */
i2c_status_t i2c_write(uint8_t addr7, const uint8_t *data, uint8_t length);

/**
 * @brief Read @p length bytes from the 7-bit slave address @p addr7.
 *
 * Issues START, SLA+R, length-1 ACKed reads, the final NACKed read, and STOP.
 */
i2c_status_t i2c_read(uint8_t addr7, uint8_t *data, uint8_t length);

/**
 * @brief Convenience helper for register-based devices: write then repeated-start read.
 *
 * Typical usage with the ENS160: write 1 byte (the register address), then
 * read N bytes from that register.
 */
i2c_status_t i2c_write_then_read(uint8_t addr7,
                                 const uint8_t *write_data, uint8_t write_length,
                                 uint8_t *read_data, uint8_t read_length);
