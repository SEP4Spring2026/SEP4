#pragma once

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

#define PAYLOAD_BUILDER_MIN_BUFFER_SIZE 256

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
        const char *classification);

#ifdef __cplusplus
}
#endif