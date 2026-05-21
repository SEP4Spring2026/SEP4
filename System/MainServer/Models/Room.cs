namespace MainServer.Models;

public class Room
{
    public int RoomId { get; set; }

    public required string Name { get; set; }

    public ICollection<SensorDevice> Sensors { get; set; }
        = new List<SensorDevice>();
}