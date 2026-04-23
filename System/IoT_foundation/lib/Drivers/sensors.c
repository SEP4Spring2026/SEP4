#include "sensors.h"
#include "dht11.h"
#include <stdio.h>

#define CO2_SENSOR_ENABLED 1

#if CO2_SENSOR_ENABLED
#include "co2.h"
#include "uart.h"
#endif

static int co2_value = -1;
static float temperature_value = 0.0f;
static float humidity_value = 0.0f;
static uint8_t dht_last_ok = 0U;
static uint8_t dht_h_i = 0U;
static uint8_t dht_h_d = 0U;
static uint8_t dht_t_i = 0U;
static uint8_t dht_t_d = 0U;
static uint32_t dht_success_count = 0U;
static uint32_t dht_fail_count = 0U;

void sensors_init(void)
{
#if CO2_SENSOR_ENABLED
    co2_init(UART3_ID); // Use UART3 (Mega pins: RX3=15, TX3=14) to match current wiring.
#endif
}

int read_co2(void)
{
#if CO2_SENSOR_ENABLED
    uint16_t ppm = 0;
    co2_status_t status = co2_read_ppm(&ppm);
    if (status == CO2_OK)
    {
        co2_value = (int)ppm;
    }
    else
    {
        printf("CO2 read error: %d\n", (int)status);
    }
#endif
    return co2_value;
}

float read_temperature(void)
{
    if (dht11_get(&dht_h_i, &dht_h_d, &dht_t_i, &dht_t_d) == DHT11_OK)
    {
        dht_last_ok = 1U;
        dht_success_count++;
        temperature_value = (float)dht_t_i + ((float)dht_t_d / 10.0f);
        humidity_value = (float)dht_h_i + ((float)dht_h_d / 10.0f);
    }
    else
    {
        dht_last_ok = 0U;
        dht_fail_count++;
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

uint8_t sensors_last_dht_ok(void)
{
    return dht_last_ok;
}

uint8_t sensors_last_dht_humidity_integer(void)
{
    return dht_h_i;
}

uint8_t sensors_last_dht_humidity_decimal(void)
{
    return dht_h_d;
}

uint8_t sensors_last_dht_temperature_integer(void)
{
    return dht_t_i;
}

uint8_t sensors_last_dht_temperature_decimal(void)
{
    return dht_t_d;
}

uint32_t sensors_dht_success_count(void)
{
    return dht_success_count;
}

uint32_t sensors_dht_fail_count(void)
{
    return dht_fail_count;
}
