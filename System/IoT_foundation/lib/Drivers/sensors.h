#pragma once

#include <stdint.h>

void sensors_init(void);
int read_co2(void);
float read_temperature(void);
float read_humidity(void);
void build_payload(char *buffer);
uint8_t sensors_last_dht_ok(void);
uint8_t sensors_last_dht_humidity_integer(void);
uint8_t sensors_last_dht_humidity_decimal(void);
uint8_t sensors_last_dht_temperature_integer(void);
uint8_t sensors_last_dht_temperature_decimal(void);
uint32_t sensors_dht_success_count(void);
uint32_t sensors_dht_fail_count(void);
