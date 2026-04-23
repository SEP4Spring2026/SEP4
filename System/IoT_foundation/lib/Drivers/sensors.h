#pragma once

#include <stdint.h>

void sensors_init(void);
int read_co2(void);
float read_temperature(void);
float read_humidity(void);
void build_payload(char *buffer);
