namespace MainServer.Models;

public class SensorDevice
{
    public int SensorId { get; set; }
    public string Status { get; set; } = "";
    
    public int? RoomId { get; set; }

    public Room? Room { get; set; }
    public List<SensorReading> Readings { get; set; } = new();
}
