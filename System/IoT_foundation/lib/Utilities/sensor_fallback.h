#pragma once

#include <stdbool.h>

#ifdef __cplusplus
extern "C"
{
#endif

    float sensor_fallback_float(bool new_value_is_valid, float new_value, float last_valid_value);
    int sensor_fallback_int(bool new_value_is_valid, int new_value, int last_valid_value);

#ifdef __cplusplus
}
#endif