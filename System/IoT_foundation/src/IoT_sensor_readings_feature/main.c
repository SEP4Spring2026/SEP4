#include "../../lib/Drivers/sensors.h"
#include "../../lib/Drivers/wifi.h"
#include <stdint.h>

#define WIFI_SSID "TestWifi"
#define WIFI_PASSWORD "testpwd"
#define WIFI_HOST_IP "192.168.1.10"

#define WIFI_PORT 5672

#define MODE_PRODUCTION 0
#define MODE_DEVELOPMENT 1 

static char wifi_rx_buffer[128];
static char payload_buffer[96];

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


int main(void)
{
    if (MODE_PRODUCTION)
    {
      
    wifi_init();
    wifi_command_AT();
    wifi_command_disable_echo();
    wifi_command_set_mode_to_1();
    wifi_command_set_to_single_Connection();
    wifi_command_join_AP(WIFI_SSID, WIFI_PASSWORD);
    wifi_command_create_TCP_connection(WIFI_HOST_IP, WIFI_PORT, wifi_rx_callback, wifi_rx_buffer);

    sensors_init();


    //Main loop
    while (1)
    {

        // CO2 SENSOR READING   
        read_co2(); 

        // TEMPERATURE SENSOR READING
        read_temperature();

        // HUMIDITY SENSOR READING
        read_humidity();

        build_payload(payload_buffer);

        wifi_send(payload_buffer);

        app_delay_ms(5000);
    }

    }
    else if (MODE_DEVELOPMENT)
    {           
        sensors_init();

        while (1)
        {
    
          read_co2(); 
        
        
          // TEMPERATURE SENSOR READING
          read_temperature();

          // HUMIDITY SENSOR READING
          read_humidity();
  
  
          app_delay_ms(15000);
        }
    }
}
