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
            Timestamp = dto.Timestamp == default ? DateTime.UtcNow : dto.Timestamp,
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
    public async Task<ActionResult<IEnumerable<object>>> GetLatest()
    {
        var readings = await _db.Readings
            .Include(r => r.Prediction)
            .Include(r => r.Sensor)
            .OrderByDescending(r => r.Timestamp)
            .Take(50)
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
}
