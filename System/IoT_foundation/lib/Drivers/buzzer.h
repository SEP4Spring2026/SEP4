/***********************************************
 * buzzer.h
 *  Buzzer driver interface
 * 
 *  Author:  Laurits Ivar
 *  Date:    2024
 *  Project: SPE4_DRIVERS
 **********************************************/
#pragma once
void buzzer_init_silent(void); // Configure buzzer pin and force OFF (active-low hardware).
void buzzer_beep(); // This function is blocking. It turns on for 25 ms, and then truns off. 
