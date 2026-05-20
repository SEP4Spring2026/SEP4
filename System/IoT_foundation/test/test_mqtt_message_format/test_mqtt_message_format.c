#include <unity.h>
#include <string.h>

#include "mqtt_message_format.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_mqtt_message_format_accepts_valid_topic(void)
{
    TEST_ASSERT_TRUE(mqtt_message_format_topic_is_valid("iot/readings"));
}

void test_mqtt_message_format_rejects_invalid_topics(void)
{
    TEST_ASSERT_FALSE(mqtt_message_format_topic_is_valid(NULL));
    TEST_ASSERT_FALSE(mqtt_message_format_topic_is_valid(""));
}

void test_mqtt_message_format_accepts_valid_payload(void)
{
    TEST_ASSERT_TRUE(mqtt_message_format_payload_is_valid("{\"sensorId\":1}"));
}

void test_mqtt_message_format_rejects_invalid_payloads(void)
{
    TEST_ASSERT_FALSE(mqtt_message_format_payload_is_valid(NULL));
    TEST_ASSERT_FALSE(mqtt_message_format_payload_is_valid(""));
}

void test_mqtt_message_format_builds_sensor_topic(void)
{
    char buffer[64];

    int result = mqtt_message_format_build_sensor_topic(
        buffer,
        sizeof(buffer),
        MQTT_DEFAULT_SENSOR_TOPIC,
        1);

    TEST_ASSERT_TRUE(result > 0);
    TEST_ASSERT_EQUAL_STRING("iot/readings/1", buffer);
}

void test_mqtt_message_format_returns_error_when_buffer_too_small(void)
{
    char buffer[5];

    int result = mqtt_message_format_build_sensor_topic(
        buffer,
        sizeof(buffer),
        MQTT_DEFAULT_SENSOR_TOPIC,
        1);

    TEST_ASSERT_EQUAL(-1, result);
}

int main(void)
{
    UNITY_BEGIN();

    RUN_TEST(test_mqtt_message_format_accepts_valid_topic);
    RUN_TEST(test_mqtt_message_format_rejects_invalid_topics);
    RUN_TEST(test_mqtt_message_format_accepts_valid_payload);
    RUN_TEST(test_mqtt_message_format_rejects_invalid_payloads);
    RUN_TEST(test_mqtt_message_format_builds_sensor_topic);
    RUN_TEST(test_mqtt_message_format_returns_error_when_buffer_too_small);

    return UNITY_END();
}