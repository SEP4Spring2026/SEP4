using MainServer.Data;
using MainServer.Dtos;
using MainServer.Models;
using MainServer.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace MainServer.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReadingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MlClient _ml;
    private readonly ReadingsStreamHub _streamHub;

    public ReadingsController(AppDbContext db, MlClient ml, ReadingsStreamHub streamHub)
    {
        _db = db;
        _ml = ml;
        _streamHub = streamHub;
    }

    [HttpPost]
    public async Task<ActionResult<PredictionDto>> Post(SensorReadingDto dto, CancellationToken cancellationToken)
    {
        var romeTz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Rome");
        var nowRome = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, romeTz);

        var device = await _db.Sensors.FirstOrDefaultAsync(s => s.SensorId == dto.SensorId, cancellationToken);
        if (device == null)
        {
            device = new SensorDevice
            {
                SensorId = dto.SensorId,
                Status = "active"
            };
            _db.Sensors.Add(device);
            await _db.SaveChangesAsync(cancellationToken);
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
        await _db.SaveChangesAsync(cancellationToken);

        PredictionDto predictionDto;
        try
        {
            predictionDto = await _ml.PredictAsync(reading, cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ml] prediction failed for reading {reading.ReadingId}: {ex.Message}");
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = "Prediction service unavailable."
            });
        }

        var prediction = new Prediction
        {
            ReadingId = reading.ReadingId,
            PredictionTime = DateTime.UtcNow,
            PredictedCategory = predictionDto.PredictedCategory,
            ConfidenceScore = predictionDto.ConfidenceScore,
            RiskLevel = predictionDto.RiskLevel
        };
        _db.Predictions.Add(prediction);
        await _db.SaveChangesAsync(cancellationToken);

        _streamHub.Publish(new ReadingStreamEvent(
            reading.ReadingId,
            reading.Timestamp,
            reading.Temperature,
            reading.Humidity,
            reading.Co2Level,
            reading.SensorId,
            new
            {
                prediction.PredictedCategory,
                prediction.RiskLevel,
                prediction.ConfidenceScore
            }));

        return Ok(predictionDto);
    }

    [HttpGet("stream")]
    public async Task Stream([FromQuery] int? sensorId, CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Append("Content-Type", "text/event-stream");

        var (subscriptionId, reader) = _streamHub.Subscribe(sensorId);
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var hasDataTask = reader.WaitToReadAsync(cancellationToken).AsTask();
                var heartbeatTask = Task.Delay(TimeSpan.FromSeconds(15), cancellationToken);
                var completed = await Task.WhenAny(hasDataTask, heartbeatTask);

                if (completed == heartbeatTask)
                {
                    await Response.WriteAsync(": keepalive\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                    continue;
                }

                if (!await hasDataTask)
                {
                    break;
                }

                while (reader.TryRead(out var streamEvent))
                {
                    var json = JsonSerializer.Serialize(streamEvent);
                    await Response.WriteAsync($"event: reading\n", cancellationToken);
                    await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                }

                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        finally
        {
            _streamHub.Unsubscribe(subscriptionId);
        }
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
    public ActionResult<IEnumerable<object>> GetDevices()
    {
        var now = DateTime.UtcNow;
        const int offlineAfterSeconds = 120;

        var devices = _db.Sensors
            .Select(s => new
            {
                s.SensorId,
                s.Status,
                ReadingCount = s.Readings.Count,
                FirstTimestamp = s.Readings
                    .OrderBy(r => r.Timestamp)
                    .Select(r => (DateTime?)r.Timestamp)
                    .FirstOrDefault(),
                LatestTimestamp = s.Readings
                    .OrderByDescending(r => r.Timestamp)
                    .Select(r => (DateTime?)r.Timestamp)
                    .FirstOrDefault()
            })
            .AsEnumerable()
            .Select(s =>
            {
                var lastSeenSeconds = s.LatestTimestamp.HasValue
                    ? Math.Max(0, (int)(now - s.LatestTimestamp.Value).TotalSeconds)
                    : (int?)null;
                var uptimeSeconds = s.FirstTimestamp.HasValue && s.LatestTimestamp.HasValue
                    ? Math.Max(0, (int)(s.LatestTimestamp.Value - s.FirstTimestamp.Value).TotalSeconds)
                    : 0;
                var isOnline = lastSeenSeconds.HasValue && lastSeenSeconds.Value <= offlineAfterSeconds;

                return new
                {
                    s.SensorId,
                    s.Status,
                    s.ReadingCount,
                    s.FirstTimestamp,
                    s.LatestTimestamp,
                    LastSeenSeconds = lastSeenSeconds,
                    UptimeSeconds = uptimeSeconds,
                    IsOnline = isOnline,
                    MissingData = !isOnline
                };
            })
            .OrderBy(s => s.SensorId)
            .ToList();

        return Ok(devices);
    }
}
