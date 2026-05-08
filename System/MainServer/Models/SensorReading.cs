namespace MainServer.Models;

public class SensorReading
{
    public int ReadingId { get; set; }
    public DateTime Timestamp { get; set; }
    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double Co2Level { get; set; }
    public double? SmokeLevel { get; set; }
    public double? Tvoc { get; set; }
    public double? Eco2 { get; set; }
    public int? Aqi { get; set; }
    public string? Classification { get; set; }

    public int SensorId { get; set; }
    public SensorDevice? Sensor { get; set; }

    public Prediction? Prediction { get; set; }
}
