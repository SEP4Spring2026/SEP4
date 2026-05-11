#pragma once

#ifdef __cplusplus
extern "C"
{
#endif

    typedef enum
    {
        ALARM_LEVEL_OFF = 0,
        ALARM_LEVEL_WARNING = 1,
        ALARM_LEVEL_CRITICAL = 2,
        ALARM_LEVEL_UNKNOWN = 3
    } alarm_level_t;

    alarm_level_t alarm_logic_from_classification(const char *classification);
    const char *alarm_logic_to_text(alarm_level_t level);

#ifdef __cplusplus
}
#endif