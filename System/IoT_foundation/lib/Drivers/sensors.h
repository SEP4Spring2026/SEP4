#pragma once

#include <stdint.h>

/** Minimum byte size for the buffer passed to build_payload(). */
#define SENSOR_PAYLOAD_BUFFER_BYTES 256

void sensors_init(void);
int read_co2(void);
float read_temperature(void);
float read_humidity(void);
void build_payload(char *buffer, uint16_t sensor_id);
uint8_t sensors_last_dht_ok(void);
uint8_t sensors_last_dht_humidity_integer(void);
uint8_t sensors_last_dht_humidity_decimal(void);
uint8_t sensors_last_dht_temperature_integer(void);
uint8_t sensors_last_dht_temperature_decimal(void);
uint32_t sensors_dht_success_count(void);
uint32_t sensors_dht_fail_count(void);

/* ENS160 air-quality sensor (tVOC / eCO2 / AQI). Returns 0 on success
 * (sensor read OK), non-zero on failure. The most recent values are
 * cached and accessible via the getters below. */
int read_air_quality(void);
uint16_t sensors_last_tvoc_ppb(void);
uint16_t sensors_last_ens160_eco2_ppm(void);
uint8_t  sensors_last_aqi(void);
uint8_t  sensors_last_ens160_ok(void);
