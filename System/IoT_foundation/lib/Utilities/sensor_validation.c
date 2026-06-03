#include "sensor_validation.h"

#define TEMPERATURE_MIN_C -40.0f
#define TEMPERATURE_MAX_C 85.0f

#define HUMIDITY_MIN_PERCENT 0.0f
#define HUMIDITY_MAX_PERCENT 100.0f

#define CO2_MIN_PPM 0
#define CO2_MAX_PPM 10000

#define AQI_MIN 0
#define AQI_MAX 5

bool sensor_validation_temperature_is_valid(float temperature)
{
    return temperature >= TEMPERATURE_MIN_C && temperature <= TEMPERATURE_MAX_C;
}

bool sensor_validation_humidity_is_valid(float humidity)
{
    return humidity >= HUMIDITY_MIN_PERCENT && humidity <= HUMIDITY_MAX_PERCENT;
}

bool sensor_validation_co2_is_valid(int co2_level)
{
    return co2_level >= CO2_MIN_PPM && co2_level <= CO2_MAX_PPM;
}

bool sensor_validation_tvoc_is_valid(int tvoc)
{
    return tvoc >= 0;
}

bool sensor_validation_eco2_is_valid(int eco2)
{
    return eco2 >= 0;
}

bool sensor_validation_aqi_is_valid(int aqi)
{
    return aqi >= AQI_MIN && aqi <= AQI_MAX;
}

bool sensor_validation_all_values_are_valid(
    float temperature,
    float humidity,
    int co2_level,
    int tvoc,
    int eco2,
    int aqi)
{
    return sensor_validation_temperature_is_valid(temperature) &&
           sensor_validation_humidity_is_valid(humidity) &&
           sensor_validation_co2_is_valid(co2_level) &&
           sensor_validation_tvoc_is_valid(tvoc) &&
           sensor_validation_eco2_is_valid(eco2) &&
           sensor_validation_aqi_is_valid(aqi);
}