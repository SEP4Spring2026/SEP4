#include "../../lib/Drivers/sensors.h"
#include "../../lib/Drivers/buzzer.h"
#include "../../lib/Drivers/uart_stdio.h"
#include <stdio.h>
#include <stdint.h>
#include <string.h>

#define WIFI_SSID "TestWifi"
#define WIFI_PASSWORD "testpwd"
#define WIFI_HOST_IP "192.168.1.10"
#define WIFI_PORT 5672
#define APP_SERIAL_BAUDRATE 115200UL

#define APP_MODE_PRODUCTION 1
#define APP_MODE_DEVELOPMENT 2

/* Change this define when switching between deployment and debugging. */
#define APP_MODE APP_MODE_DEVELOPMENT

static char payload_buffer[96];

#if APP_MODE == APP_MODE_PRODUCTION
#include "../../lib/Drivers/wifi.h"
static char wifi_rx_buffer[128];

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

static void wifi_rx_callback(void)
{
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
    wifi_init();
    wifi_command_AT();
    wifi_command_disable_echo();
    wifi_command_set_mode_to_1();
    wifi_command_set_to_single_Connection();
    wifi_command_join_AP(WIFI_SSID, WIFI_PASSWORD);
    wifi_command_create_TCP_connection(WIFI_HOST_IP, WIFI_PORT, wifi_rx_callback, wifi_rx_buffer);

    sensors_init();

    // Main loop
    while (1)
    {
        read_co2();
        read_temperature();
        read_humidity();
        build_payload(payload_buffer);
        wifi_send(payload_buffer);
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

    uint32_t sample_count = 0;
    while (1)
    {
        sample_count++;
        int co2 = read_co2();
        float temp = read_temperature();
        float hum = read_humidity();
        build_payload(payload_buffer);

        printf("\n[Sample %lu]\n", (unsigned long)sample_count);
        printf("DHT status: %s (ok=%lu, fail=%lu)\n",
               sensors_last_dht_ok() ? "OK" : "FAIL",
               (unsigned long)sensors_dht_success_count(),
               (unsigned long)sensors_dht_fail_count());
        printf("DHT raw -> T=%u.%u C, H=%u.%u %%\n",
               sensors_last_dht_temperature_integer(),
               sensors_last_dht_temperature_decimal(),
               sensors_last_dht_humidity_integer(),
               sensors_last_dht_humidity_decimal());
        printf("CO2=%d ppm, Temp=%.1f C, Hum=%.1f %%\n", co2, temp, hum);
        printf("Payload length: %u\n", (unsigned)strlen(payload_buffer));
        printf("Payload: %s\n", payload_buffer);
        app_delay_ms(5000);
    }
#else
#error "APP_MODE is invalid. Use APP_MODE_PRODUCTION or APP_MODE_DEVELOPMENT."
#endif
}
