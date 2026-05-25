using MainServer.Data;
using MainServer.Dtos;
using MainServer.Models;
using MainServer.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace MainServer.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "ResidentOrAbove")]   // all endpoints require login by default
public class ReadingsController : ControllerBase
{
    private static DateTime LocalReadingTimestamp()
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Rome");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        }
        catch (TimeZoneNotFoundException) { return DateTime.UtcNow; }
    }

    private static DateTime CutoffForRollingHours(double hoursBack)
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Rome");
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).AddHours(-hoursBack);
        }
        catch (TimeZoneNotFoundException) { return DateTime.UtcNow.AddHours(-hoursBack); }
    }

    private static readonly JsonSerializerOptions StreamJsonOptions = new(JsonSerializerDefaults.Web);

    private static SensorPayloadDto ResolveSensorPayload(SensorReadingDto dto)
    {
        if (dto.Sensors is not null) return dto.Sensors;
        return new SensorPayloadDto
        {
            Temperature = dto.Temperature ?? 0,
            Humidity    = dto.Humidity    ?? 0,
            Co2Level    = dto.Co2Level    ?? 0,
            Tvoc        = dto.Tvoc        ?? 0,
            Eco2        = dto.Eco2        ?? 0,
            Aqi         = dto.Aqi         ?? 0,
        };
    }

    private readonly AppDbContext _db;
    private readonly MlClient _ml;
    private readonly ReadingsStreamHub _streamHub;
    private readonly AlarmMqttPublisher _alarmMqtt;

    public ReadingsController(AppDbContext db, MlClient ml, ReadingsStreamHub streamHub, AlarmMqttPublisher alarmMqtt)
    {
        _db = db; _ml = ml; _streamHub = streamHub; _alarmMqtt = alarmMqtt;
    }

    // ── IoT device posts readings; we allow API key or service account ──
    // In practice the IoT device should use a dedicated service token.
    // For now we keep it accessible to admins + the device itself.
    [HttpPost]
    [Authorize(Policy = "AdminOrAbove")]
    public async Task<ActionResult<PredictionDto>> Post(SensorReadingDto dto, CancellationToken ct)
    {
        var nowRome = LocalReadingTimestamp();

        var device = await _db.Sensors.FirstOrDefaultAsync(s => s.SensorId == dto.SensorId, ct);
        if (device == null)
        {
            device = new SensorDevice { SensorId = dto.SensorId, Status = "active" };
            _db.Sensors.Add(device);
            await _db.SaveChangesAsync(ct);
        }

        var sensors = ResolveSensorPayload(dto);
        var reading = new SensorReading
        {
            SensorId       = device.SensorId,
            Timestamp      = dto.Timestamp == default ? nowRome : dto.Timestamp,
            Temperature    = sensors.Temperature,
            Humidity       = sensors.Humidity,
            Co2Level       = sensors.Co2Level,
            Tvoc           = sensors.Tvoc,
            Eco2           = sensors.Eco2,
            Aqi            = sensors.Aqi,
            Classification = dto.Classification
        };
        _db.Readings.Add(reading);
        await _db.SaveChangesAsync(ct);

        PredictionDto predictionDto;
        try { predictionDto = await _ml.PredictAsync(reading, ct); }
        catch (Exception ex)
        {
            Console.WriteLine($"[ml] prediction failed for reading {reading.ReadingId}: {ex.Message}");
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Prediction service unavailable." });
        }

        var prediction = new Prediction
        {
            ReadingId         = reading.ReadingId,
            PredictionTime    = DateTime.UtcNow,
            PredictedCategory = predictionDto.PredictedCategory,
            ConfidenceScore   = predictionDto.ConfidenceScore,
            RiskLevel         = predictionDto.RiskLevel
        };
        _db.Predictions.Add(prediction);
        await _db.SaveChangesAsync(ct);

        _streamHub.Publish(new ReadingStreamEvent(
            reading.ReadingId, reading.Timestamp,
            reading.Temperature, reading.Humidity, reading.Co2Level,
            reading.Tvoc, reading.Eco2, reading.Aqi,
            reading.Classification, reading.SensorId,
            new { prediction.PredictedCategory, prediction.RiskLevel, prediction.ConfidenceScore }));

        await _alarmMqtt.PublishForPredictedCategoryAsync(device.SensorId, predictionDto.PredictedCategory, ct);

        return Ok(predictionDto);
    }

    // ── Alarm test: building-admin or system-admin only ──
    [HttpPost("alarm-test")]
    [Authorize(Policy = "AdminOrAbove")]
    public async Task<IActionResult> PostAlarmTest([FromQuery] int sensorId, CancellationToken ct, [FromQuery] string level = "critical")
    {
        if (!_alarmMqtt.IsAlarmTestEnabled)
            return StatusCode(503, new { message = "Alarm test is disabled. Set ALLOW_ALARM_TEST=true and ALARM_MQTT_HOST." });

        if (sensorId < 1)
            return BadRequest(new { message = "sensorId must be a positive device id." });

        try
        {
            await _alarmMqtt.PublishAlarmTestAsync(sensorId, level, ct).ConfigureAwait(false);
            return NoContent();
        }
        catch (ArgumentException ex)   { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return StatusCode(503, new { message = ex.Message }); }
        catch (Exception ex)
        {
            Console.WriteLine($"[alarm-test] {ex.Message}");
            return StatusCode(502, new { message = "MQTT publish failed." });
        }
    }

    // ── SSE stream: any authenticated user ──
    [HttpGet("stream")]
    [Authorize(Policy = "ResidentOrAbove")]
    public async Task Stream([FromQuery] int? sensorId, CancellationToken ct)
    {
        if (User.IsInRole("resident"))
        {
            var sensorClaim = User.FindFirst("SensorId")?.Value;
            if (!int.TryParse(sensorClaim, out var assignedId))
            {
                Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }

            sensorId = assignedId;
        }

        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Append("Content-Type", "text/event-stream");

        var (subscriptionId, reader) = _streamHub.Subscribe(sensorId);
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var hasDataTask   = reader.WaitToReadAsync(ct).AsTask();
                var heartbeatTask = Task.Delay(TimeSpan.FromSeconds(15), ct);
                var completed     = await Task.WhenAny(hasDataTask, heartbeatTask);

                if (completed == heartbeatTask)
                {
                    await Response.WriteAsync(": keepalive\n\n", ct);
                    await Response.Body.FlushAsync(ct);
                    continue;
                }
                if (!await hasDataTask) break;

                while (reader.TryRead(out var evt))
                {
                    var json = JsonSerializer.Serialize(evt, StreamJsonOptions);
                    await Response.WriteAsync($"event: reading\n", ct);
                    await Response.WriteAsync($"data: {json}\n\n", ct);
                }
                await Response.Body.FlushAsync(ct);
            }
        }
        finally { _streamHub.Unsubscribe(subscriptionId); }
    }

    // ── GET readings: all authenticated users ──
    [HttpGet]
    [Authorize(Policy = "ResidentOrAbove")]
    public async Task<ActionResult<IEnumerable<object>>> GetLatest(
        [FromQuery] int? sensorId,
        [FromQuery] int? limit,
        [FromQuery] double? hours)
    {
        const int defaultLimit        = 200;
        const int maxLimitNoWindow    = 1000;
        const int maxLimitWithHours   = 15000;
        const double maxHours         = 336;

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

        // Residents are restricted to their assigned sensor (claim: "SensorId")
        if (User.IsInRole("resident"))
        {
            var sensorClaim = User.FindFirst("SensorId")?.Value;
            if (int.TryParse(sensorClaim, out var assignedId))
                query = query.Where(r => r.SensorId == assignedId);
            else
                return Forbid();
        }
        else if (sensorId.HasValue)
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
                r.ReadingId, r.Timestamp,
                r.Temperature, r.Humidity, r.Co2Level,
                r.Tvoc, r.Eco2, r.Aqi,
                r.Classification, r.SensorId,
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

    // ── Device list: building-admin and system-admin ──
    [HttpGet("devices")]
    [Authorize(Policy = "AdminOrAbove")]
    public ActionResult<IEnumerable<object>> GetDevices()
    {
        var now = DateTime.UtcNow;
        const int offlineAfterSeconds = 120;

        var devices = _db.Sensors
            .Select(s => new
            {
                s.SensorId, s.Status,
                ReadingCount    = s.Readings.Count,
                FirstTimestamp  = s.Readings.OrderBy(r => r.Timestamp).Select(r => (DateTime?)r.Timestamp).FirstOrDefault(),
                LatestTimestamp = s.Readings.OrderByDescending(r => r.Timestamp).Select(r => (DateTime?)r.Timestamp).FirstOrDefault()
            })
            .AsEnumerable()
            .Select(s =>
            {
                var lastSeenSeconds = s.LatestTimestamp.HasValue
                    ? Math.Max(0, (int)(now - s.LatestTimestamp.Value).TotalSeconds) : (int?)null;
                var uptimeSeconds = s.FirstTimestamp.HasValue && s.LatestTimestamp.HasValue
                    ? Math.Max(0, (int)(s.LatestTimestamp.Value - s.FirstTimestamp.Value).TotalSeconds) : 0;
                var isOnline = lastSeenSeconds.HasValue && lastSeenSeconds.Value <= offlineAfterSeconds;
                return new
                {
                    s.SensorId, s.Status, s.ReadingCount,
                    s.FirstTimestamp, s.LatestTimestamp,
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

    // ── Alerts history: building-admin and above ──
    // Returns the last N readings where Classification != "Normal"
    [HttpGet("alerts")]
    [Authorize(Policy = "AdminOrAbove")]
    public async Task<IActionResult> GetAlerts([FromQuery] int? sensorId, [FromQuery] int limit = 50)
    {
        if (limit < 1) limit = 1;
        if (limit > 500) limit = 500;

        IQueryable<SensorReading> query = _db.Readings
            .Include(r => r.Prediction)
            .Where(r => r.Classification != null && r.Classification != "Normal");

        if (sensorId.HasValue)
            query = query.Where(r => r.SensorId == sensorId.Value);

        var alerts = await query
            .OrderByDescending(r => r.Timestamp)
            .Take(limit)
            .Select(r => new
            {
                r.ReadingId, r.Timestamp,
                r.Temperature, r.Humidity, r.Co2Level,
                r.Classification, r.SensorId,
                Prediction = r.Prediction == null ? null : new
                {
                    r.Prediction.PredictedCategory,
                    r.Prediction.RiskLevel,
                    r.Prediction.ConfidenceScore
                }
            })
            .ToListAsync();

        return Ok(alerts);
    }
}
