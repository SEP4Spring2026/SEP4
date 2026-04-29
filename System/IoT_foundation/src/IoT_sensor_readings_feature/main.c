#include "../../lib/Drivers/sensors.h"
#include "../../lib/Drivers/buzzer.h"
#include "../../lib/Drivers/uart_stdio.h"
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <stdbool.h>

#if defined(__has_include)
#if __has_include(<avr/interrupt.h>)
#include <avr/interrupt.h>
#define APP_HAVE_AVR_INTERRUPTS 1
#endif
#endif

#ifndef APP_HAVE_AVR_INTERRUPTS
#define APP_HAVE_AVR_INTERRUPTS 0
#endif

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
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

static void app_serial_debug_flush(void)
{
    fflush(stdout);
}

static void app_log_wifi_step(const char *step_name, WIFI_ERROR_MESSAGE_t result)
{
    printf("[WIFI] %-18s : %s (%d)\n", step_name, (result == WIFI_OK) ? "OK" : "FAIL", (int)result);
    app_serial_debug_flush();
}

static char mqtt_rx_buffer[128];

static void mqtt_rx_callback(void)
{
}

static WIFI_ERROR_MESSAGE_t mqtt_connect_over_tcp(void)
{
    WIFI_ERROR_MESSAGE_t result;
    uint8_t packet[96];
    uint8_t idx = 0;
    uint8_t client_id_len = (uint8_t)strlen(MQTT_CLIENT_ID);
    uint8_t remaining_length = (uint8_t)(10U + 2U + client_id_len);

    result = wifi_command_create_TCP_connection((char *)MQTT_BROKER_HOST, MQTT_BROKER_PORT, mqtt_rx_callback, mqtt_rx_buffer);
    if (result != WIFI_OK)
    {
        return result;
    }

    packet[idx++] = 0x10; /* MQTT CONNECT fixed header */
    packet[idx++] = remaining_length;
    packet[idx++] = 0x00;
    packet[idx++] = 0x04;
    packet[idx++] = 'M';
    packet[idx++] = 'Q';
    packet[idx++] = 'T';
    packet[idx++] = 'T';
    packet[idx++] = 0x04; /* Protocol level 4 (MQTT 3.1.1) */
    packet[idx++] = 0x02; /* Clean session */
    packet[idx++] = 0x00;
    packet[idx++] = 60;   /* Keep alive seconds */
    packet[idx++] = 0x00;
    packet[idx++] = client_id_len;
    memcpy(&packet[idx], MQTT_CLIENT_ID, client_id_len);
    idx = (uint8_t)(idx + client_id_len);

    return wifi_command_TCP_transmit(packet, idx);
}

static WIFI_ERROR_MESSAGE_t mqtt_publish_over_tcp(const char *topic, const char *payload)
{
    uint8_t packet[192];
    uint8_t idx = 0;
    uint8_t topic_len = (uint8_t)strlen(topic);
    uint8_t payload_len = (uint8_t)strlen(payload);
    uint8_t remaining_length = (uint8_t)(2U + topic_len + payload_len);

    if (remaining_length >= 128U)
    {
        return WIFI_FAIL;
    }

    packet[idx++] = 0x30; /* MQTT PUBLISH, QoS0, retain=0 */
    packet[idx++] = remaining_length;
    packet[idx++] = 0x00;
    packet[idx++] = topic_len;
    memcpy(&packet[idx], topic, topic_len);
    idx = (uint8_t)(idx + topic_len);
    memcpy(&packet[idx], payload, payload_len);
    idx = (uint8_t)(idx + payload_len);

    return wifi_command_TCP_transmit(packet, idx);
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
    app_enable_global_interrupts();

#if APP_MODE == APP_MODE_PRODUCTION
// This is for testing connection with WIFI Module
    WIFI_ERROR_MESSAGE_t wifi_result;
    bool mqtt_ready = false;
    (void)uart_stdio_init(APP_SERIAL_BAUDRATE);
    printf("\n[BOOT] Serial debug ready\n");
    printf("[BOOT] Waiting 3s before WiFi init...\n");
    app_serial_debug_flush();
    app_delay_ms(3000);

    printf("[BOOT] Starting WiFi+MQTT initialization...\n");
    app_serial_debug_flush();
    wifi_init();

    wifi_result = wifi_command_AT();
    app_log_wifi_step("AT", wifi_result);

    wifi_result = wifi_command_disable_echo();
    app_log_wifi_step("ATE0", wifi_result);

    wifi_result = wifi_command_set_mode_to_1();
    app_log_wifi_step("CWMODE=1", wifi_result);

    wifi_result = wifi_command_set_to_single_Connection();
    app_log_wifi_step("CIPMUX=0", wifi_result);

    printf("[WIFI] Joining AP: %s\n", WIFI_SSID);
    app_serial_debug_flush();
    wifi_result = wifi_command_join_AP(WIFI_SSID, WIFI_PASSWORD);
    app_log_wifi_step("CWJAP", wifi_result);

    wifi_result = mqtt_connect_over_tcp();
    app_log_wifi_step("MQTT-TCP CONNECT", wifi_result);
    mqtt_ready = (wifi_result == WIFI_OK);

    printf("Production mode started (MQTT over TCP)\n");
    printf("MQTT broker       : %s:%u\n", MQTT_BROKER_HOST, (unsigned)MQTT_BROKER_PORT);
    printf("MQTT topic        : %s\n", MQTT_TOPIC);
    printf("Serial baud       : %lu\n", (unsigned long)APP_SERIAL_BAUDRATE);
    app_serial_debug_flush();

    sensors_init();

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
        app_serial_debug_flush();

        if (mqtt_ready)
        {
            publish_result = mqtt_publish_over_tcp(MQTT_TOPIC, payload_buffer);
            if (publish_result != WIFI_OK)
            {
                printf("[MQTT] Publish failed (%d), reconnecting...\n", (int)publish_result);
                wifi_command_close_TCP_connection();
                wifi_result = mqtt_connect_over_tcp();
                app_log_wifi_step("MQTT-TCP RECONN", wifi_result);
                mqtt_ready = (wifi_result == WIFI_OK);
                if (mqtt_ready)
                {
                    publish_result = mqtt_publish_over_tcp(MQTT_TOPIC, payload_buffer);
                }
            }
            printf("[MQTT] Publish result : %s (%d)\n", publish_result == WIFI_OK ? "OK" : "FAIL", (int)publish_result);
        }
        else
        {
            printf("[MQTT] Publish skipped (MQTT TCP session not ready).\n");
            wifi_result = mqtt_connect_over_tcp();
            app_log_wifi_step("MQTT-TCP RECONN", wifi_result);
            mqtt_ready = (wifi_result == WIFI_OK);
        }
        app_serial_debug_flush();
        app_delay_ms(5000);
    }

#elif APP_MODE == APP_MODE_DEVELOPMENT
    (void)uart_stdio_init(APP_SERIAL_BAUDRATE);
    buzzer_init_silent();
    sensors_init();
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
