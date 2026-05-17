#include "alarm_logic.h"

#include <string.h>

alarm_level_t alarm_logic_from_classification(const char *classification)
{
    if (classification == NULL)
    {
        return ALARM_LEVEL_UNKNOWN;
    }

    if (
        strcmp(classification, "normal") == 0 ||
        strcmp(classification, "Normal") == 0)
    {
        return ALARM_LEVEL_OFF;
    }

    if (
        strcmp(classification, "warning") == 0 ||
        strcmp(classification, "smoke") == 0 ||
        strcmp(classification, "ambient_smoke") == 0)
    {
        return ALARM_LEVEL_WARNING;
    }

    if (
        strcmp(classification, "fire") == 0 ||
        strcmp(classification, "critical") == 0)
    {
        return ALARM_LEVEL_CRITICAL;
    }

    return ALARM_LEVEL_UNKNOWN;
}

const char *alarm_logic_to_text(alarm_level_t level)
{
    switch (level)
    {
    case ALARM_LEVEL_OFF:
        return "off";
    case ALARM_LEVEL_WARNING:
        return "warning";
    case ALARM_LEVEL_CRITICAL:
        return "critical";
    default:
        return "unknown";
    }
}