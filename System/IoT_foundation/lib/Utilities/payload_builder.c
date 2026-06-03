#include "payload_builder.h"

#include <stdio.h>

int payload_builder_build(
    char *buffer,
    size_t buffer_size,
    uint16_t sensor_id,
    uint8_t temperature_integer,
    uint8_t temperature_decimal,
    uint8_t humidity_integer,
    uint8_t humidity_decimal,
    int co2_level,
    uint16_t tvoc,
    uint16_t eco2,
    uint8_t aqi,
    const char *classification)
{
    if (buffer == NULL || buffer_size == 0 || classification == NULL)
    {
        return -1;
    }

    int written = snprintf(
        buffer,
        buffer_size,
        "{\"sensorId\":%u,\"sensors\":{\"temperature\":%u.%u,\"humidity\":%u.%u,\"co2Level\":%d,\"tvoc\":%u,\"eco2\":%u,\"aqi\":%u},\"classification\":\"%s\"}",
        sensor_id,
        temperature_integer,
        temperature_decimal,
        humidity_integer,
        humidity_decimal,
        co2_level,
        (unsigned)tvoc,
        (unsigned)eco2,
        (unsigned)aqi,
        classification);

    if (written < 0 || (size_t)written >= buffer_size)
    {
        return -1;
    }

    return written;
}