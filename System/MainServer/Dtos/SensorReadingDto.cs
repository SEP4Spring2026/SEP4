namespace MainServer.Dtos;

public class SensorReadingDto
{
    public int SensorId { get; set; }
    public DateTime Timestamp { get; set; }

    /// <summary>Optional nested payload (e.g. dashboard). MQTT/firmware sends flat root fields instead.</summary>
    public SensorPayloadDto? Sensors { get; set; }

    /// <summary>Flat IoT JSON: temperature, humidity, co2Level, tvoc, eco2, aqi.</summary>
    public double? Temperature { get; set; }
    public double? Humidity { get; set; }
    public double? Co2Level { get; set; }
    public double? Tvoc { get; set; }
    public double? Eco2 { get; set; }
    public int? Aqi { get; set; }

    public string? Classification { get; set; }
}

public class SensorPayloadDto
{
    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double Co2Level { get; set; }
    public double Tvoc { get; set; }
    public double Eco2 { get; set; }
    public int Aqi { get; set; }
}
