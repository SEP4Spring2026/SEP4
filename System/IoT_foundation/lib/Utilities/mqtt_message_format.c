#include "mqtt_message_format.h"

#include <stdio.h>
#include <string.h>

bool mqtt_message_format_topic_is_valid(const char *topic)
{
    if (topic == NULL)
    {
        return false;
    }

    return strlen(topic) > 0;
}

bool mqtt_message_format_payload_is_valid(const char *payload)
{
    if (payload == NULL)
    {
        return false;
    }

    return strlen(payload) > 0;
}

int mqtt_message_format_build_sensor_topic(
    char *buffer,
    size_t buffer_size,
    const char *base_topic,
    uint16_t sensor_id)
{
    if (buffer == NULL || buffer_size == 0 || base_topic == NULL || strlen(base_topic) == 0)
    {
        return -1;
    }

    int written = snprintf(
        buffer,
        buffer_size,
        "%s/%u",
        base_topic,
        sensor_id);

    if (written < 0 || (size_t)written >= buffer_size)
    {
        return -1;
    }

    return written;
}