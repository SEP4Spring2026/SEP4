using MainServer.Data;
using MainServer.Dtos;
using MainServer.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MainServer.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOrAbove")]   // building-admin + system-admin only
public class RoomController : ControllerBase
{
    private readonly AppDbContext _db;
    public RoomController(AppDbContext db) => _db = db;

    // GET: api/room  — also available to residents (read-only)
    [HttpGet]
    [Authorize(Policy = "ResidentOrAbove")]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _db.Rooms
            .Include(r => r.Sensors)
            .Select(r => new
            {
                r.RoomId, r.Name,
                Sensors = r.Sensors.Select(s => new { s.SensorId, s.Status })
            })
            .ToListAsync();

        return Ok(rooms);
    }

    // POST: api/room
    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomDto dto)
    {
        var room = new Room { Name = dto.Name };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();
        return Ok(new { room.RoomId, room.Name });
    }

    // PUT: api/room/{roomId}/assign-sensor
    [HttpPut("{roomId}/assign-sensor")]
    public async Task<IActionResult> AssignSensor(int roomId, [FromBody] AssignSensorDto dto)
    {
        if (!dto.SensorId.HasValue || dto.SensorId.Value < 1)
            return BadRequest(new { message = "sensorId must be a positive device id." });

        var room = await _db.Rooms.FindAsync(roomId);
        if (room == null) return NotFound(new { message = "Room not found." });

        var sensor = await _db.Sensors.FindAsync(dto.SensorId.Value);
        if (sensor == null) return NotFound(new { message = "Sensor not found." });

        sensor.RoomId = roomId;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Sensor assigned.", sensor.SensorId, sensor.RoomId });
    }

    // PUT: api/room/unassign-sensor/{sensorId}
    [HttpPut("unassign-sensor/{sensorId}")]
    public async Task<IActionResult> UnassignSensor(int sensorId)
    {
        var sensor = await _db.Sensors.FindAsync(sensorId);
        if (sensor == null) return NotFound(new { message = "Sensor not found." });

        sensor.RoomId = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Sensor unassigned.", sensor.SensorId });
    }
}
