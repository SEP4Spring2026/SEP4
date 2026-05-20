#include <unity.h>

#include "buzzer_behavior.h"

void setUp(void)
{
}

void tearDown(void)
{
}

void test_buzzer_behavior_turns_off_for_normal_alarm(void)
{
    TEST_ASSERT_EQUAL(BUZZER_MODE_OFF, buzzer_behavior_from_alarm_level(ALARM_LEVEL_OFF));
}

void test_buzzer_behavior_uses_slow_beep_for_warning(void)
{
    TEST_ASSERT_EQUAL(BUZZER_MODE_SLOW_BEEP, buzzer_behavior_from_alarm_level(ALARM_LEVEL_WARNING));
}

void test_buzzer_behavior_uses_fast_beep_for_critical(void)
{
    TEST_ASSERT_EQUAL(BUZZER_MODE_FAST_BEEP, buzzer_behavior_from_alarm_level(ALARM_LEVEL_CRITICAL));
}

void test_buzzer_behavior_uses_safe_default_for_unknown(void)
{
    TEST_ASSERT_EQUAL(BUZZER_MODE_OFF, buzzer_behavior_from_alarm_level(ALARM_LEVEL_UNKNOWN));
}

void test_buzzer_behavior_converts_modes_to_text(void)
{
    TEST_ASSERT_EQUAL_STRING("off", buzzer_behavior_to_text(BUZZER_MODE_OFF));
    TEST_ASSERT_EQUAL_STRING("slow_beep", buzzer_behavior_to_text(BUZZER_MODE_SLOW_BEEP));
    TEST_ASSERT_EQUAL_STRING("fast_beep", buzzer_behavior_to_text(BUZZER_MODE_FAST_BEEP));
}

int main(void)
{
    UNITY_BEGIN();

    RUN_TEST(test_buzzer_behavior_turns_off_for_normal_alarm);
    RUN_TEST(test_buzzer_behavior_uses_slow_beep_for_warning);
    RUN_TEST(test_buzzer_behavior_uses_fast_beep_for_critical);
    RUN_TEST(test_buzzer_behavior_uses_safe_default_for_unknown);
    RUN_TEST(test_buzzer_behavior_converts_modes_to_text);

    return UNITY_END();
}