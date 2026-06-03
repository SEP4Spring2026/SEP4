#include "buzzer_behavior.h"

buzzer_mode_t buzzer_behavior_from_alarm_level(alarm_level_t level)
{
    switch (level)
    {
    case ALARM_LEVEL_WARNING:
        return BUZZER_MODE_SLOW_BEEP;

    case ALARM_LEVEL_CRITICAL:
        return BUZZER_MODE_FAST_BEEP;

    case ALARM_LEVEL_OFF:
    case ALARM_LEVEL_UNKNOWN:
    default:
        return BUZZER_MODE_OFF;
    }
}

const char *buzzer_behavior_to_text(buzzer_mode_t mode)
{
    switch (mode)
    {
    case BUZZER_MODE_SLOW_BEEP:
        return "slow_beep";

    case BUZZER_MODE_FAST_BEEP:
        return "fast_beep";

    case BUZZER_MODE_OFF:
    default:
        return "off";
    }
}