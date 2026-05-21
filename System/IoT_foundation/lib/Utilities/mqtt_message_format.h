#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

#define MQTT_DEFAULT_SENSOR_TOPIC "iot/readings"

    bool mqtt_message_format_topic_is_valid(const char *topic);
    bool mqtt_message_format_payload_is_valid(const char *payload);

    int mqtt_message_format_build_sensor_topic(
        char *buffer,
        size_t buffer_size,
        const char *base_topic,
        uint16_t sensor_id);

#ifdef __cplusplus
}
#endif