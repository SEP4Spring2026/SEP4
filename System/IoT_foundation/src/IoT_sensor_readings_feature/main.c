#include "../../lib/Drivers/sensors.h"
#include "../../lib/Drivers/buzzer.h"
#include "../../lib/Drivers/uart_stdio.h"
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#if defined(__has_include)
#if __has_include(<avr/interrupt.h>)
#include <avr/interrupt.h>
#define APP_HAVE_AVR_INTERRUPTS 1
#endif
#endif

#ifndef APP_HAVE_AVR_INTERRUPTS
#define APP_HAVE_AVR_INTERRUPTS 0
#endif

#define WIFI_SSID "TestWifi"
#define WIFI_PASSWORD "testpwd"
#define MQTT_BROKER_HOST "159.195.147.132"
#define MQTT_BROKER_PORT 1883
#define MQTT_CLIENT_ID "iot-device-101"
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""
#define MQTT_TOPIC "iot/readings"
#define LOCAL_DEVICE_ID 101U
#define APP_SERIAL_BAUDRATE 115200UL

#define APP_MODE_PRODUCTION 1
#define APP_MODE_DEVELOPMENT 2

/* Change this define when switching between deployment and debugging. */
#define APP_MODE APP_MODE_PRODUCTION

static char payload_buffer[96];

static void app_enable_global_interrupts(void)
{
#if APP_HAVE_AVR_INTERRUPTS
    sei();
#endif
}

#if APP_MODE == APP_MODE_PRODUCTION
#include "../../lib/Drivers/wifi.h"

static void app_delay_ms(uint16_t ms)
{
    volatile uint32_t i = 0;
    for (uint16_t m = 0; m < ms; m++)
    {
        for (i = 0; i < 2000U; i++)
        {
        }
    }
}

#else
static void app_delay_ms(uint16_t ms)
{
    volatile uint32_t i = 0;
    for (uint16_t m = 0; m < ms; m++)
    {
        for (i = 0; i < 2000U; i++)
        {
        }
    }
}
#endif

int main(void)
{
#if APP_MODE == APP_MODE_PRODUCTION
    
// This is for testing connection with WIFI Module
    (void)uart_stdio_init(APP_SERIAL_BAUDRATE);
    wifi_init();
    wifi_command_AT();
    wifi_command_disable_echo();
    wifi_command_set_mode_to_1();
    wifi_command_set_to_single_Connection();
    wifi_command_join_AP(WIFI_SSID, WIFI_PASSWORD);
    wifi_command_mqtt_user_config(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
    wifi_command_mqtt_connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
    printf("Production mode started (MQTT enabled)\n");
    printf("MQTT broker       : %s:%u\n", MQTT_BROKER_HOST, (unsigned)MQTT_BROKER_PORT);
    printf("MQTT topic        : %s\n", MQTT_TOPIC);
    printf("Serial baud       : %lu\n", (unsigned long)APP_SERIAL_BAUDRATE);

    sensors_init();
    app_enable_global_interrupts();

    // Main loop
    while (1)
    {
        WIFI_ERROR_MESSAGE_t publish_result;
        read_co2();
        read_temperature();
        read_humidity();
        build_payload(payload_buffer, LOCAL_DEVICE_ID);

        /* Debug: print payload just before publish to MQTT. */
        printf("\n[MQTT] About to publish\n");
        printf("[MQTT] Topic          : %s\n", MQTT_TOPIC);
        printf("[MQTT] Payload length : %u\n", (unsigned)strlen(payload_buffer));
        printf("[MQTT] Payload        : %s\n", payload_buffer);

        publish_result = wifi_command_mqtt_publish(MQTT_TOPIC, payload_buffer, 0, 0);
        if (publish_result != WIFI_OK)
        {
            printf("[MQTT] Publish failed (%d), reconnecting...\n", (int)publish_result);
            /* Recover by re-establishing the MQTT session and retrying once. */
            wifi_command_mqtt_connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
            publish_result = wifi_command_mqtt_publish(MQTT_TOPIC, payload_buffer, 0, 0);
        }
        printf("[MQTT] Publish result : %s (%d)\n", publish_result == WIFI_OK ? "OK" : "FAIL", (int)publish_result);
        app_delay_ms(5000);
    }

#elif APP_MODE == APP_MODE_DEVELOPMENT
    (void)uart_stdio_init(APP_SERIAL_BAUDRATE);
    buzzer_init_silent();
    sensors_init();
    app_enable_global_interrupts();
    printf("Development mode started (WiFi disabled)\n");
    printf("Serial baud: %lu\n", (unsigned long)APP_SERIAL_BAUDRATE);
    printf("CO2 sensor enabled in this build\n");
    printf("Sampling every 5000 ms\n");
    printf("========================================\n");

    uint32_t sample_count = 0;
    while (1)
    {
        sample_count++;
        int co2 = read_co2();
        (void)read_temperature();
        (void)read_humidity();
        build_payload(payload_buffer, LOCAL_DEVICE_ID);

        printf("\n========== Sample %lu ==========\n", (unsigned long)sample_count);
        
        // DHT Status (if it works or not)
        printf("DHT status       : %s\n",
        sensors_last_dht_ok() ? "OK" : "FAIL");

        // CO2 Status (if it works or not)
        printf("CO2 status       : %s\n", co2 >= 0 ? "OK" : "FAIL");

        // Raw DHT Reading (both temperature and humidity)
        printf("DHT (Raw)        : T = %u.%u C, H = %u.%u %%\n",
            sensors_last_dht_temperature_integer(),
            sensors_last_dht_temperature_decimal(),
            sensors_last_dht_humidity_integer(),
            sensors_last_dht_humidity_decimal());

        // Temperature Reading (Only temperature reading from DHT)
        printf("DHT (Temp)       : %u.%u C\n",
            sensors_last_dht_temperature_integer(),
            sensors_last_dht_temperature_decimal());

        // Humidity Reading (Only humidity reading from DHT)
        printf("DHT (Hum)        : %u.%u %%\n",
            sensors_last_dht_humidity_integer(),
            sensors_last_dht_humidity_decimal());
        
        // CO2 Reading (ppm)
        printf("CO2              : %d ppm\n", co2);

        // JSON Payload Script (For communication with main WebAPI via RabbitMQ)
        printf("Payload          : %s\n", payload_buffer);

        // Payload length (Keep only for debugging, for the Proof of Concept)
        printf("Payload length   : %u\n", (unsigned)strlen(payload_buffer));

        printf("================================\n");

        app_delay_ms(5000);
    }
    
#else
#error "APP_MODE is invalid. Use APP_MODE_PRODUCTION or APP_MODE_DEVELOPMENT."
#endif
}
