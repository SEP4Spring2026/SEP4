/***********************************************
 * buzzer.c
 *  Buzzer driver implementation
 * 
 *  Author:  Laurits Ivar / Erland Larsen
 *  Date:    2024
 *  Project: SPE4_API
 *  Revision history: 
 * 			 0.1 - Initial version for SEP4_DRIVERS (Laurits Ivar)
 * 			 0.9 - 2026-03-06 Beep duration increased and integrated 
 *                  into SPE4_API (Erland Larsen)
 **********************************************/
#include "buzzer.h"
#include <stdint.h>

#if defined(__has_include)
#if __has_include(<avr/io.h>) && __has_include(<util/delay.h>)
#include <avr/io.h>
#include <util/delay.h>
#define BUZ_HAVE_AVR_HEADERS 1
#endif
#endif

#ifndef BUZ_HAVE_AVR_HEADERS
#define BUZ_HAVE_AVR_HEADERS 0
#endif

#define BUZ_PIN 3U
#if BUZ_HAVE_AVR_HEADERS && defined(DDRE) && defined(PORTE) && defined(PE5)
#define BUZ_USE_DIRECT_PORT 1
#else
#define BUZ_USE_DIRECT_PORT 0
#endif

static void buzzer_hw_init(void)
{
#if BUZ_USE_DIRECT_PORT
    DDRE |= (1 << PE5);
#else
    (void)BUZ_PIN;
#endif
}

static void buzzer_hw_off(void)
{
#if BUZ_USE_DIRECT_PORT
    PORTE |= (1 << PE5); // OFF for active-low buzzer.
#else
    (void)BUZ_PIN;
#endif
}

static void buzzer_hw_on(void)
{
#if BUZ_USE_DIRECT_PORT
    PORTE &= ~(1 << PE5); // ON for active-low buzzer.
#else
    (void)BUZ_PIN;
#endif
}

void buzzer_init_silent(void)
{
    buzzer_hw_init();
    buzzer_hw_off();
}

void buzzer_beep(){

    buzzer_init_silent();
    buzzer_hw_on();
#if BUZ_HAVE_AVR_HEADERS
    _delay_ms(25);
#endif
    buzzer_hw_off();
}