#include <unity.h>

#include "sensor_fallback.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_sensor_fallback_float_uses_new_value_when_valid(void)
{
    float result = sensor_fallback_float(true, 23.5f, 20.0f);

    TEST_ASSERT_FLOAT_WITHIN(0.01f, 23.5f, result);
}

void test_sensor_fallback_float_keeps_last_valid_value_when_invalid(void)
{
    float result = sensor_fallback_float(false, -999.0f, 20.0f);

    TEST_ASSERT_FLOAT_WITHIN(0.01f, 20.0f, result);
}

void test_sensor_fallback_int_uses_new_value_when_valid(void)
{
    int result = sensor_fallback_int(true, 420, 400);

    TEST_ASSERT_EQUAL(420, result);
}

void test_sensor_fallback_int_keeps_last_valid_value_when_invalid(void)
{
    int result = sensor_fallback_int(false, -1, 400);

    TEST_ASSERT_EQUAL(400, result);
}

int main(void)
{
    UNITY_BEGIN();

    RUN_TEST(test_sensor_fallback_float_uses_new_value_when_valid);
    RUN_TEST(test_sensor_fallback_float_keeps_last_valid_value_when_invalid);
    RUN_TEST(test_sensor_fallback_int_uses_new_value_when_valid);
    RUN_TEST(test_sensor_fallback_int_keeps_last_valid_value_when_invalid);

    return UNITY_END();
}