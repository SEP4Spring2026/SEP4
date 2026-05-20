#include "sensor_fallback.h"

float sensor_fallback_float(bool new_value_is_valid, float new_value, float last_valid_value)
{
    if (new_value_is_valid)
    {
        return new_value;
    }

    return last_valid_value;
}

int sensor_fallback_int(bool new_value_is_valid, int new_value, int last_valid_value)
{
    if (new_value_is_valid)
    {
        return new_value;
    }

    return last_valid_value;
}