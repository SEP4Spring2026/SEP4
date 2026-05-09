namespace MainServer.Dtos;

public class SensorReadingDto
{
    public int SensorId { get; set; }
    public DateTime Timestamp { get; set; }

    /// <summary>Nested sensor readings.</summary>
    public SensorPayloadDto? Sensors { get; set; }

    /// <summary>Flat root fields used when <see cref="Sensors"/> is null.</summary>
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
