#pragma once

#include "alarm_logic.h"

#ifdef __cplusplus
extern "C"
{
#endif

    typedef enum
    {
        BUZZER_MODE_OFF = 0,
        BUZZER_MODE_SLOW_BEEP = 1,
        BUZZER_MODE_FAST_BEEP = 2
    } buzzer_mode_t;

    buzzer_mode_t buzzer_behavior_from_alarm_level(alarm_level_t level);
    const char *buzzer_behavior_to_text(buzzer_mode_t mode);

#ifdef __cplusplus
}
#endif