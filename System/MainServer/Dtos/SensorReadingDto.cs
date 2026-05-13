namespace MainServer.Dtos;

public class SensorReadingDto
{
    public int SensorId { get; set; }
    public DateTime Timestamp { get; set; }
    public SensorPayloadDto Sensors { get; set; } = new();
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
