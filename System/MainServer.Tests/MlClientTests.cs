using System.Net;
using System.Text.Json;
using MainServer.Models;
using MainServer.Services;

namespace MainServer.Tests;

public class MlClientTests
{
    [Fact]
    public async Task PredictAsync_PostsExpectedPayloadToPredictEndpoint()
    {
        var handler = new CapturingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent(new
            {
                predictedCategory = "Fire",
                confidenceScore = 0.91,
                riskLevel = "High"
            })
        });
        var client = new MlClient(new HttpClient(handler)
        {
            BaseAddress = new Uri("http://ml-server:8000")
        });
        var reading = new SensorReading
        {
            SensorId = 42,
            Timestamp = new DateTime(2026, 4, 8, 12, 15, 0, DateTimeKind.Utc),
            Temperature = 38,
            Humidity = 15,
            Co2Level = 2500,
            Tvoc = 1000,
            Eco2 = 8000,
            Aqi = 5,
            Classification = "Fire"
        };

        var prediction = await client.PredictAsync(reading);

        Assert.Equal("Fire", prediction.PredictedCategory);
        Assert.Equal(0.91, prediction.ConfidenceScore);
        Assert.Equal("High", prediction.RiskLevel);
        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("/predict", handler.Request.RequestUri!.AbsolutePath);

        var body = JsonDocument.Parse(handler.Body!);
        Assert.Equal(42, body.RootElement.GetProperty("sensorId").GetInt32());
        Assert.Equal("Fire", body.RootElement.GetProperty("classification").GetString());
        var sensors = body.RootElement.GetProperty("sensors");
        Assert.Equal(38, sensors.GetProperty("temperature").GetDouble());
        Assert.Equal(15, sensors.GetProperty("humidity").GetDouble());
        Assert.Equal(2500, sensors.GetProperty("co2Level").GetDouble());
        Assert.Equal(1000, sensors.GetProperty("tvoc").GetDouble());
        Assert.Equal(8000, sensors.GetProperty("eco2").GetDouble());
        Assert.Equal(5, sensors.GetProperty("aqi").GetInt32());
    }

    [Fact]
    public async Task PredictAsync_RetriesOnceWhenFirstRequestFails()
    {
        var attempts = 0;
        var handler = new CapturingHandler(_ =>
        {
            attempts++;
            return attempts == 1
                ? new HttpResponseMessage(HttpStatusCode.BadGateway)
                : new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = JsonContent(new
                    {
                        predictedCategory = "Normal",
                        confidenceScore = 0.83,
                        riskLevel = "Low"
                    })
                };
        });
        var client = new MlClient(new HttpClient(handler)
        {
            BaseAddress = new Uri("http://ml-server:8000")
        });

        var prediction = await client.PredictAsync(new SensorReading
        {
            SensorId = 7,
            Timestamp = DateTime.UtcNow,
            Temperature = 22,
            Humidity = 40,
            Co2Level = 400,
            Tvoc = 100,
            Eco2 = 400,
            Aqi = 1
        });

        Assert.Equal(2, attempts);
        Assert.Equal("Normal", prediction.PredictedCategory);
    }

    [Fact]
    public async Task PredictAsync_DefaultsNullableAirQualityFields()
    {
        var handler = new CapturingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent(new
            {
                predictedCategory = "Normal",
                confidenceScore = 0.72,
                riskLevel = "Low"
            })
        });
        var client = new MlClient(new HttpClient(handler)
        {
            BaseAddress = new Uri("http://ml-server:8000")
        });

        await client.PredictAsync(new SensorReading
        {
            SensorId = 9,
            Timestamp = DateTime.UtcNow,
            Temperature = 21,
            Humidity = 42,
            Co2Level = 500,
            Tvoc = null,
            Eco2 = null,
            Aqi = null
        });

        var body = JsonDocument.Parse(handler.Body!);
        var sensors = body.RootElement.GetProperty("sensors");
        Assert.Equal(0, sensors.GetProperty("tvoc").GetDouble());
        Assert.Equal(0, sensors.GetProperty("eco2").GetDouble());
        Assert.Equal(1, sensors.GetProperty("aqi").GetInt32());
    }

    [Fact]
    public async Task PredictAsync_ThrowsWhenMlServerKeepsFailing()
    {
        var attempts = 0;
        var handler = new CapturingHandler(_ =>
        {
            attempts++;
            return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
        });
        var client = new MlClient(new HttpClient(handler)
        {
            BaseAddress = new Uri("http://ml-server:8000")
        });

        await Assert.ThrowsAsync<HttpRequestException>(() => client.PredictAsync(new SensorReading
        {
            SensorId = 3,
            Timestamp = DateTime.UtcNow,
            Temperature = 20,
            Humidity = 50,
            Co2Level = 450,
            Tvoc = 20,
            Eco2 = 400,
            Aqi = 1
        }));

        Assert.Equal(2, attempts);
    }

    private static ByteArrayContent JsonContent(object value)
    {
        var json = JsonSerializer.Serialize(value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return new StringContent(json, System.Text.Encoding.UTF8, "application/json");
    }

    private sealed class CapturingHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

        public CapturingHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
        {
            _respond = respond;
        }

        public HttpRequestMessage? Request { get; private set; }
        public string? Body { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Request = request;
            Body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return _respond(request);
        }
    }
}
