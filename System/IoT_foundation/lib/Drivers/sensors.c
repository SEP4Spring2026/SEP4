#include "sensors.h"
#include "dht11.h"
#include <stdio.h>

#define CO2_SENSOR_ENABLED 1
#define ENS160_SENSOR_ENABLED 1

#if CO2_SENSOR_ENABLED
#include "co2.h"
#include "uart.h"
#endif

#if ENS160_SENSOR_ENABLED
#include "i2c.h"
#include "ens160.h"
#define ENS160_I2C_CLOCK_HZ 100000UL
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

static uint16_t tvoc_ppb_value = 0U;
static uint16_t ens160_eco2_ppm_value = 0U;
static uint8_t aqi_value = 0U;
static uint8_t ens160_last_ok = 0U;

void sensors_init(void)
{
#if CO2_SENSOR_ENABLED
    co2_init(UART3_ID); // Use UART3 (Mega pins: RX3=15, TX3=14) to match current wiring.
#endif

#if ENS160_SENSOR_ENABLED
    i2c_init(ENS160_I2C_CLOCK_HZ);
    ens160_status_t ens_status = ens160_init(ENS160_I2C_ADDR_DEFAULT);
    if (ens_status != ENS160_OK)
    {
        printf("ENS160 init error: %d\n", (int)ens_status);
    }
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

int read_air_quality(void)
{
#if ENS160_SENSOR_ENABLED
    if (!ens160_is_ready())
    {
        ens160_last_ok = 0U;
        return -1;
    }

    /* Push the latest temperature/humidity to improve compensation. The DHT11
     * is read earlier in the loop, so these values are fresh. */
    if (dht_last_ok)
    {
        (void)ens160_set_compensation(temperature_value, humidity_value);
    }

    uint16_t eco2 = 0U;
    uint16_t tvoc = 0U;
    uint8_t aqi = 0U;
    ens160_status_t status = ens160_read(&eco2, &tvoc, &aqi);
    if ((status == ENS160_OK) || (status == ENS160_NOT_READY))
    {
        tvoc_ppb_value = tvoc;
        ens160_eco2_ppm_value = eco2;
        aqi_value = aqi;
        ens160_last_ok = (uint8_t)((status == ENS160_OK) ? 1U : 0U);
        return (status == ENS160_OK) ? 0 : 1; /* 1 = warming up. */
    }

    printf("ENS160 read error: %d\n", (int)status);
    ens160_last_ok = 0U;
    return (int)status;
#else
    return 0;
#endif
}

void build_payload(char *buffer, uint16_t sensor_id)
{
    snprintf(
        buffer,
        SENSOR_PAYLOAD_BUFFER_BYTES,
        "{\"sensorId\":%u,\"sensors\":{\"temperature\":%u.%u,\"humidity\":%u.%u,\"co2Level\":%d,\"tvoc\":%u,\"eco2\":%u,\"aqi\":%u},\"classification\":\"Normal\"}",
        sensor_id,
        dht_t_i,
        dht_t_d,
        dht_h_i,
        dht_h_d,
        co2_value,
        (unsigned)tvoc_ppb_value,
        (unsigned)ens160_eco2_ppm_value,
        (unsigned)aqi_value
    );
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

uint16_t sensors_last_tvoc_ppb(void)
{
    return tvoc_ppb_value;
}

uint16_t sensors_last_ens160_eco2_ppm(void)
{
    return ens160_eco2_ppm_value;
}

uint8_t sensors_last_aqi(void)
{
    return aqi_value;
}

uint8_t sensors_last_ens160_ok(void)
{
    return ens160_last_ok;
}
