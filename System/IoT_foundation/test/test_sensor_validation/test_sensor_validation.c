#include <unity.h>

#include "sensor_validation.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_sensor_validation_accepts_valid_values(void)
{
    TEST_ASSERT_TRUE(sensor_validation_temperature_is_valid(23.5f));
    TEST_ASSERT_TRUE(sensor_validation_humidity_is_valid(45.0f));
    TEST_ASSERT_TRUE(sensor_validation_co2_is_valid(420));
    TEST_ASSERT_TRUE(sensor_validation_tvoc_is_valid(12));
    TEST_ASSERT_TRUE(sensor_validation_eco2_is_valid(400));
    TEST_ASSERT_TRUE(sensor_validation_aqi_is_valid(2));
}

void test_sensor_validation_rejects_invalid_humidity(void)
{
    TEST_ASSERT_FALSE(sensor_validation_humidity_is_valid(-1.0f));
    TEST_ASSERT_FALSE(sensor_validation_humidity_is_valid(101.0f));
}

void test_sensor_validation_rejects_invalid_co2_values(void)
{
    TEST_ASSERT_FALSE(sensor_validation_co2_is_valid(-1));
    TEST_ASSERT_FALSE(sensor_validation_co2_is_valid(10001));
}

void test_sensor_validation_rejects_negative_gas_values(void)
{
    TEST_ASSERT_FALSE(sensor_validation_tvoc_is_valid(-1));
    TEST_ASSERT_FALSE(sensor_validation_eco2_is_valid(-1));
}

void test_sensor_validation_checks_all_values_together(void)
{
    TEST_ASSERT_TRUE(sensor_validation_all_values_are_valid(
        23.5f,
        45.0f,
        420,
        12,
        400,
        2));

    TEST_ASSERT_FALSE(sensor_validation_all_values_are_valid(
        23.5f,
        120.0f,
        420,
        12,
        400,
        2));
}

int main(void)
{
    UNITY_BEGIN();

    RUN_TEST(test_sensor_validation_accepts_valid_values);
    RUN_TEST(test_sensor_validation_rejects_invalid_humidity);
    RUN_TEST(test_sensor_validation_rejects_invalid_co2_values);
    RUN_TEST(test_sensor_validation_rejects_negative_gas_values);
    RUN_TEST(test_sensor_validation_checks_all_values_together);

    return UNITY_END();
}