#include "sensors.h"
#include "co2.h"
#include "dht11.h"
#include <stdio.h>

static int co2_value = -1;
static float temperature_value = 0.0f;
static float humidity_value = 0.0f;

void sensors_init(void)
{
    co2_init(1);
}

int read_co2(void)
{
    uint16_t ppm = 0;
    if (co2_read_ppm(&ppm) == CO2_OK)
    {
        co2_value = (int)ppm;
    }
    
    return co2_value;
}

float read_temperature(void)
{
    uint8_t h_i = 0;
    uint8_t h_d = 0;
    uint8_t t_i = 0;
    uint8_t t_d = 0;

    if (dht11_get(&h_i, &h_d, &t_i, &t_d) == DHT11_OK)
    {
        temperature_value = (float)t_i + ((float)t_d / 10.0f);
        humidity_value = (float)h_i + ((float)h_d / 10.0f);
    }
    return temperature_value;
}

float read_humidity(void)
{
    return humidity_value;
}

void build_payload(char *buffer)
{
    snprintf(buffer, 96, "{\"co2\":%d,\"temp\":%.1f,\"hum\":%.1f}", co2_value, temperature_value, humidity_value);
}
