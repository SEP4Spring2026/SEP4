#include <unity.h>
#include <string.h>

#include "payload_builder.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_payload_builder_creates_expected_json(void)
{
    char buffer[PAYLOAD_BUILDER_MIN_BUFFER_SIZE];

    int result = payload_builder_build(
        buffer,
        sizeof(buffer),
        1,
        23,
        4,
        45,
        1,
        420,
        12,
        400,
        2,
        "normal");

    TEST_ASSERT_GREATER_THAN(0, result);
    TEST_ASSERT_EQUAL_STRING(
        "{\"sensorId\":1,\"sensors\":{\"temperature\":23.4,\"humidity\":45.1,\"co2Level\":420,\"tvoc\":12,\"eco2\":400,\"aqi\":2},\"classification\":\"normal\"}",
        buffer);
}

void test_payload_builder_returns_error_when_buffer_is_null(void)
{
    int result = payload_builder_build(
        NULL,
        PAYLOAD_BUILDER_MIN_BUFFER_SIZE,
        1,
        23,
        4,
        45,
        1,
        420,
        12,
        400,
        2,
        "normal");

    TEST_ASSERT_EQUAL(-1, result);
}

int main(void)
{
    UNITY_BEGIN();

    RUN_TEST(test_payload_builder_creates_expected_json);
    RUN_TEST(test_payload_builder_returns_error_when_buffer_is_null);

    return UNITY_END();
}