#pragma once

#include <stdbool.h>

#ifdef __cplusplus
extern "C"
{
#endif

    bool sensor_validation_temperature_is_valid(float temperature);
    bool sensor_validation_humidity_is_valid(float humidity);
    bool sensor_validation_co2_is_valid(int co2_level);
    bool sensor_validation_tvoc_is_valid(int tvoc);
    bool sensor_validation_eco2_is_valid(int eco2);
    bool sensor_validation_aqi_is_valid(int aqi);

    bool sensor_validation_all_values_are_valid(
        float temperature,
        float humidity,
        int co2_level,
        int tvoc,
        int eco2,
        int aqi);

#ifdef __cplusplus
}
#endif