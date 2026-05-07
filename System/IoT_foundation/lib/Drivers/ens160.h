/***********************************************
 * ens160.h
 *  ScioSense ENS160 air-quality sensor (tVOC / eCO2 / AQI)
 *
 *  Author:  SEP4 Team
 *  Date:    2026-05-07
 *  Project: SPE4_API
 *
 *  Datasheet refs:
 *      PART_ID         = 0x00..0x01  (expected 0x0160)
 *      OPMODE          = 0x10        (0x02 = standard gas sensing)
 *      TEMP_IN/RH_IN   = 0x13..0x16  (compensation inputs)
 *      DEVICE_STATUS   = 0x20
 *      DATA_AQI        = 0x21        (UBA AQI, 1..5)
 *      DATA_TVOC       = 0x22..0x23  (ppb, little-endian)
 *      DATA_ECO2       = 0x24..0x25  (ppm, little-endian)
 *
 *  Default 7-bit I2C address: 0x53 (ADDR pin high). Some breakouts wire
 *  ADDR to ground giving 0x52. Use ENS160_I2C_ADDR_DEFAULT or
 *  ENS160_I2C_ADDR_ALT.
 **********************************************/
#pragma once

#include <stdint.h>

#define ENS160_I2C_ADDR_DEFAULT 0x53U
#define ENS160_I2C_ADDR_ALT     0x52U
#define ENS160_PART_ID          0x0160U

typedef enum {
    ENS160_OK = 0,
    ENS160_FAIL = -1,
    ENS160_NOT_INITIALIZED = -2,
    ENS160_INVALID_ARG = -3,
    ENS160_BAD_PART_ID = -4,
    ENS160_I2C_ERROR = -5,
    ENS160_NOT_READY = -6
} ens160_status_t;

/**
 * @brief Reset the ENS160, verify the part ID and switch it to standard
 *        gas-sensing mode. Call ::i2c_init before this function.
 *
 * @param i2c_address 7-bit I2C address; pass ENS160_I2C_ADDR_DEFAULT (0x53)
 *                    for the typical wiring.
 */
ens160_status_t ens160_init(uint8_t i2c_address);

/**
 * @brief Read the latest air-quality measurements.
 *
 * Any of the output pointers may be NULL if a particular value isn't needed.
 * Returns ENS160_NOT_READY while the sensor is still warming up; in that
 * case the values are set to safe defaults (0).
 *
 * @param[out] eco2_ppm Equivalent CO2 in ppm (typically 400..65000).
 * @param[out] tvoc_ppb Total VOC concentration in ppb.
 * @param[out] aqi      UBA Air Quality Index, 1 (excellent) .. 5 (unhealthy).
 */
ens160_status_t ens160_read(uint16_t *eco2_ppm, uint16_t *tvoc_ppb, uint8_t *aqi);

/**
 * @brief Push ambient temperature (Celsius) and relative humidity (%) to
 *        the sensor as compensation inputs. Optional but improves accuracy.
 */
ens160_status_t ens160_set_compensation(float temperature_c, float humidity_percent);

/**
 * @brief Returns 1 if ::ens160_init succeeded, 0 otherwise.
 */
uint8_t ens160_is_ready(void);
