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
    private static DateTime LocalReadingTimestamp()
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Rome");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        }
        catch (TimeZoneNotFoundException)
        {
            return DateTime.UtcNow;
        }
    }

    /// <summary>
    /// Rolling window cutoff using the same clock as stored readings (<see cref="LocalReadingTimestamp"/>).
    /// </summary>
    private static DateTime CutoffForRollingHours(double hoursBack)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Rome");
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            return nowLocal.AddHours(-hoursBack);
        }
        catch (TimeZoneNotFoundException)
        {
            return DateTime.UtcNow.AddHours(-hoursBack);
        }
    }

    private static readonly JsonSerializerOptions StreamJsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>Mqtt/firmware POST flat JSON; nested <see cref="SensorReadingDto.Sensors"/> when present.</summary>
    /// <summary>Nested <c>sensors</c> object or flat root metrics.</summary>
    private static SensorPayloadDto ResolveSensorPayload(SensorReadingDto dto)
    {
        if (dto.Sensors is not null)
            return dto.Sensors;

        return new SensorPayloadDto
        {
            Temperature = dto.Temperature ?? 0,
            Humidity = dto.Humidity ?? 0,
            Co2Level = dto.Co2Level ?? 0,
            Tvoc = dto.Tvoc ?? 0,
            Eco2 = dto.Eco2 ?? 0,
            Aqi = dto.Aqi ?? 0,
        };
    }

    private readonly AppDbContext _db;
    private readonly MlClient _ml;
    private readonly ReadingsStreamHub _streamHub;
    private readonly AlarmMqttPublisher _alarmMqtt;

    public ReadingsController(
        AppDbContext db,
        MlClient ml,
        ReadingsStreamHub streamHub,
        AlarmMqttPublisher alarmMqtt)
    {
        _db = db;
        _ml = ml;
        _streamHub = streamHub;
        _alarmMqtt = alarmMqtt;
    }

    [HttpPost]
    public async Task<ActionResult<PredictionDto>> Post(SensorReadingDto dto, CancellationToken cancellationToken)
    {
        var nowRome = LocalReadingTimestamp();

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

        var sensors = ResolveSensorPayload(dto);
        var reading = new SensorReading
        {
            SensorId = device.SensorId,
            Timestamp = dto.Timestamp == default ? nowRome : dto.Timestamp,
            Temperature = sensors.Temperature,
            Humidity = sensors.Humidity,
            Co2Level = sensors.Co2Level,
            Tvoc = sensors.Tvoc,
            Eco2 = sensors.Eco2,
            Aqi = sensors.Aqi,
            Classification = dto.Classification
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
            reading.Tvoc,
            reading.Eco2,
            reading.Aqi,
            reading.Classification,
            reading.SensorId,
            new
            {
                prediction.PredictedCategory,
                prediction.RiskLevel,
                prediction.ConfidenceScore
            }));

        await _alarmMqtt.PublishRiskLevelAsync(device.SensorId, predictionDto.RiskLevel, cancellationToken);

        return Ok(predictionDto);
    }

    /// <summary>MQTT-only buzzer test for Settings UI; requires ALLOW_ALARM_TEST=true and ALARM_MQTT_HOST.</summary>
    [HttpPost("alarm-test")]
    public async Task<IActionResult> PostAlarmTest(
        [FromQuery] int sensorId,
        CancellationToken cancellationToken,
        [FromQuery] string level = "critical")
    {
        if (!_alarmMqtt.IsAlarmTestEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Alarm test is disabled. Set ALLOW_ALARM_TEST=true and ALARM_MQTT_HOST on the server.",
            });
        }

        if (sensorId < 1)
            return BadRequest(new { message = "sensorId must be a positive device id." });

        try
        {
            await _alarmMqtt.PublishAlarmTestAsync(sensorId, level, cancellationToken).ConfigureAwait(false);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[alarm-test] {ex.Message}");
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "MQTT publish failed." });
        }
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
                    var json = JsonSerializer.Serialize(streamEvent, StreamJsonOptions);
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
        [FromQuery] int? limit,
        [FromQuery] double? hours)
    {
        const int defaultLimit = 200;
        const int maxLimitNoWindow = 1000;
        const int maxLimitWithHours = 15000;
        const double maxHours = 168;

        var take = limit ?? defaultLimit;
        if (take < 1) take = 1;

        double? windowHours = null;
        if (hours.HasValue)
        {
            var h = hours.Value;
            if (h > 0 && !double.IsNaN(h) && !double.IsInfinity(h))
                windowHours = Math.Min(h, maxHours);
        }

        var maxLimit = windowHours.HasValue ? maxLimitWithHours : maxLimitNoWindow;
        if (take > maxLimit) take = maxLimit;

        IQueryable<SensorReading> query = _db.Readings
            .Include(r => r.Prediction)
            .Include(r => r.Sensor);

        if (sensorId.HasValue)
        {
            query = query.Where(r => r.SensorId == sensorId.Value);
        }

        if (windowHours.HasValue)
        {
            var cutoff = CutoffForRollingHours(windowHours.Value);
            query = query.Where(r => r.Timestamp >= cutoff);
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
                r.Tvoc,
                r.Eco2,
                r.Aqi,
                r.Classification,
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
