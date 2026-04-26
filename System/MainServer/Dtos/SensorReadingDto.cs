namespace MainServer.Dtos;

public class SensorReadingDto
{
    public int SensorId { get; set; }
    public DateTime Timestamp { get; set; }
    public double Temperature { get; set; }
    public double Humidity { get; set; }
    public double Co2Level { get; set; }
}
