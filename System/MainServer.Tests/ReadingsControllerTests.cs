using System.Net;
using System.Text.Json;
using MainServer.Controllers;
using MainServer.Data;
using MainServer.Dtos;
using MainServer.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace MainServer.Tests;

public class ReadingsControllerTests
{
    [Fact]
    public async Task Post_SavesReadingAndPrediction_ReturnsPrediction()
    {
        await using var db = CreateDbContext();
        var mlHandler = new FakeMlHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent(new
            {
                predictedCategory = "Fire",
                confidenceScore = 0.94,
                riskLevel = "High"
            })
        });
        var controller = CreateController(db, mlHandler);

        var result = await controller.Post(new SensorReadingDto
        {
            SensorId = 9001,
            Timestamp = new DateTime(2026, 4, 8, 12, 15, 0, DateTimeKind.Utc),
            Sensors = new SensorPayloadDto
            {
                Temperature = 38,
                Humidity = 15,
                Co2Level = 2500,
                Tvoc = 1000,
                Eco2 = 8000,
                Aqi = 5
            },
            Classification = "UnitTest-Fire"
        }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<PredictionDto>(ok.Value);
        Assert.Equal("Fire", response.PredictedCategory);
        Assert.Equal("High", response.RiskLevel);
        Assert.Equal(0.94, response.ConfidenceScore);

        Assert.Equal(1, mlHandler.CallCount);
        Assert.Equal("/predict", mlHandler.Request!.RequestUri!.AbsolutePath);
        Assert.Equal(1, await db.Sensors.CountAsync());
        Assert.Equal(1, await db.Readings.CountAsync());
        Assert.Equal(1, await db.Predictions.CountAsync());

        var savedReading = await db.Readings.Include(r => r.Prediction).SingleAsync();
        Assert.Equal(9001, savedReading.SensorId);
        Assert.Equal(38, savedReading.Temperature);
        Assert.Equal("UnitTest-Fire", savedReading.Classification);
        Assert.Equal("Fire", savedReading.Prediction!.PredictedCategory);
    }

    [Fact]
    public async Task Post_WhenMlFails_ReturnsBadGatewayAndDoesNotSavePrediction()
    {
        await using var db = CreateDbContext();
        var mlHandler = new FakeMlHttpHandler(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        var controller = CreateController(db, mlHandler);

        var result = await controller.Post(new SensorReadingDto
        {
            SensorId = 9002,
            Sensors = new SensorPayloadDto
            {
                Temperature = 22,
                Humidity = 45,
                Co2Level = 500,
                Tvoc = 30,
                Eco2 = 410,
                Aqi = 1
            },
            Classification = "UnitTest-Normal"
        }, CancellationToken.None);

        var status = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status502BadGateway, status.StatusCode);
        Assert.Equal(2, mlHandler.CallCount);
        Assert.Equal(1, await db.Sensors.CountAsync());
        Assert.Equal(1, await db.Readings.CountAsync());
        Assert.Equal(0, await db.Predictions.CountAsync());
    }

    private static ReadingsController CreateController(AppDbContext db, FakeMlHttpHandler mlHandler)
    {
        Environment.SetEnvironmentVariable("ALARM_MQTT_HOST", null);
        var mlClient = new MlClient(new HttpClient(mlHandler)
        {
            BaseAddress = new Uri("http://ml-server:8000")
        });
        var alarm = new AlarmMqttPublisher(NullLogger<AlarmMqttPublisher>.Instance);
        return new ReadingsController(db, mlClient, new ReadingsStreamHub(), alarm);
    }

    private static AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private static ByteArrayContent JsonContent(object value)
    {
        var json = JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new StringContent(json, System.Text.Encoding.UTF8, "application/json");
    }

    private sealed class FakeMlHttpHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public FakeMlHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        {
            _respond = respond;
        }

        public HttpRequestMessage? Request { get; private set; }
        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;
            Request = request;
            return Task.FromResult(_respond(request));
        }
    }
}
