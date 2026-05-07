using MainServer.Data;
using MainServer.Dtos;
using MainServer.Models;
using MainServer.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MainServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReadingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MlClient _ml;

    public ReadingsController(AppDbContext db, MlClient ml)
    {
        _db = db;
        _ml = ml;
    }

    [HttpPost]
    public async Task<ActionResult<PredictionDto>> Post(SensorReadingDto dto)
    {
        var romeTz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Rome");
        var nowRome = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, romeTz);

        var device = await _db.Sensors.FirstOrDefaultAsync(s => s.SensorId == dto.SensorId);
        if (device == null)
        {
            device = new SensorDevice
            {
                SensorId = dto.SensorId,
                Status = "active"
            };
            _db.Sensors.Add(device);
            await _db.SaveChangesAsync();
        }

        var reading = new SensorReading
        {
            SensorId = device.SensorId,
            Timestamp = dto.Timestamp == default ? nowRome : dto.Timestamp,
            Temperature = dto.Temperature,
            Humidity = dto.Humidity,
            Co2Level = dto.Co2Level
        };
        _db.Readings.Add(reading);
        await _db.SaveChangesAsync();

        var predictionDto = await _ml.PredictAsync(reading);

        var prediction = new Prediction
        {
            ReadingId = reading.ReadingId,
            PredictionTime = DateTime.UtcNow,
            PredictedCategory = predictionDto.PredictedCategory,
            ConfidenceScore = predictionDto.ConfidenceScore,
            RiskLevel = predictionDto.RiskLevel
        };
        _db.Predictions.Add(prediction);
        await _db.SaveChangesAsync();

        return Ok(predictionDto);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetLatest(
        [FromQuery] int? sensorId,
        [FromQuery] int? limit)
    {
        const int defaultLimit = 200;
        const int maxLimit = 1000;
        var take = limit ?? defaultLimit;
        if (take < 1) take = 1;
        if (take > maxLimit) take = maxLimit;

        IQueryable<SensorReading> query = _db.Readings
            .Include(r => r.Prediction)
            .Include(r => r.Sensor);

        if (sensorId.HasValue)
        {
            query = query.Where(r => r.SensorId == sensorId.Value);
        }

        var readings = await query
            .OrderByDescending(r => r.Timestamp)
            .Take(take)
            .Select(r => new
            {
                r.ReadingId,
                r.Timestamp,
                r.Temperature,
                r.Humidity,
                r.Co2Level,
                r.SensorId,
                Prediction = r.Prediction == null ? null : new
                {
                    r.Prediction.PredictedCategory,
                    r.Prediction.RiskLevel,
                    r.Prediction.ConfidenceScore
                }
            })
            .ToListAsync();

        return Ok(readings);
    }

    [HttpGet("devices")]
    public async Task<ActionResult<IEnumerable<object>>> GetDevices()
    {
        var devices = await _db.Sensors
            .Select(s => new
            {
                s.SensorId,
                s.Status,
                ReadingCount = s.Readings.Count,
                LatestTimestamp = s.Readings
                    .OrderByDescending(r => r.Timestamp)
                    .Select(r => (DateTime?)r.Timestamp)
                    .FirstOrDefault()
            })
            .OrderBy(s => s.SensorId)
            .ToListAsync();

        return Ok(devices);
    }
}
