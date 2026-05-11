#include <unity.h>

#include "alarm_logic.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_alarm_logic_maps_normal_to_off(void)
{
    TEST_ASSERT_EQUAL(ALARM_LEVEL_OFF, alarm_logic_from_classification("normal"));
    TEST_ASSERT_EQUAL(ALARM_LEVEL_OFF, alarm_logic_from_classification("Normal"));
}

void test_alarm_logic_maps_warning_values_to_warning(void)
{
    TEST_ASSERT_EQUAL(ALARM_LEVEL_WARNING, alarm_logic_from_classification("warning"));
    TEST_ASSERT_EQUAL(ALARM_LEVEL_WARNING, alarm_logic_from_classification("smoke"));
    TEST_ASSERT_EQUAL(ALARM_LEVEL_WARNING, alarm_logic_from_classification("ambient_smoke"));
}

void test_alarm_logic_maps_fire_values_to_critical(void)
{
    TEST_ASSERT_EQUAL(ALARM_LEVEL_CRITICAL, alarm_logic_from_classification("fire"));
    TEST_ASSERT_EQUAL(ALARM_LEVEL_CRITICAL, alarm_logic_from_classification("critical"));
}

void test_alarm_logic_handles_unknown_and_null_values(void)
{
    TEST_ASSERT_EQUAL(ALARM_LEVEL_UNKNOWN, alarm_logic_from_classification("unknown_value"));
    TEST_ASSERT_EQUAL(ALARM_LEVEL_UNKNOWN, alarm_logic_from_classification(NULL));
}

void test_alarm_logic_converts_levels_to_text(void)
{
    TEST_ASSERT_EQUAL_STRING("off", alarm_logic_to_text(ALARM_LEVEL_OFF));
    TEST_ASSERT_EQUAL_STRING("warning", alarm_logic_to_text(ALARM_LEVEL_WARNING));
    TEST_ASSERT_EQUAL_STRING("critical", alarm_logic_to_text(ALARM_LEVEL_CRITICAL));
    TEST_ASSERT_EQUAL_STRING("unknown", alarm_logic_to_text(ALARM_LEVEL_UNKNOWN));
}

int main(void)
{
    UNITY_BEGIN();

    RUN_TEST(test_alarm_logic_maps_normal_to_off);
    RUN_TEST(test_alarm_logic_maps_warning_values_to_warning);
    RUN_TEST(test_alarm_logic_maps_fire_values_to_critical);
    RUN_TEST(test_alarm_logic_handles_unknown_and_null_values);
    RUN_TEST(test_alarm_logic_converts_levels_to_text);

    return UNITY_END();
}