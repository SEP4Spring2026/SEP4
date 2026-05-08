using MainServer.Models;

namespace MainServer.Tests;

public class SensorDeviceTests
{
    [Fact]
    public void NewDevice_HasSensibleDefaults()
    {
        var device = new SensorDevice();

        Assert.Equal(0, device.SensorId);
        Assert.Equal("", device.Status);
        Assert.NotNull(device.Readings);
        Assert.Empty(device.Readings);
    }
}

public class SensorReadingTests
{
    [Fact]
    public void NewReading_NullableFieldsAreNull()
    {
        var reading = new SensorReading();

        Assert.Null(reading.SmokeLevel);
        Assert.Null(reading.Tvoc);
        Assert.Null(reading.Eco2);
        Assert.Null(reading.Aqi);
        Assert.Null(reading.Classification);
        Assert.Null(reading.Sensor);
        Assert.Null(reading.Prediction);
    }

    [Fact]
    public void Reading_PropertiesRoundTrip()
    {
        var ts = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var reading = new SensorReading
        {
            ReadingId = 7,
            Timestamp = ts,
            Temperature = 22.5,
            Humidity = 41.0,
            Co2Level = 800,
            SmokeLevel = 0.1,
            Tvoc = 28,
            Eco2 = 410,
            Aqi = 1,
            Classification = "No Smoke",
            SensorId = 3,
        };

        Assert.Equal(7, reading.ReadingId);
        Assert.Equal(ts, reading.Timestamp);
        Assert.Equal(22.5, reading.Temperature);
        Assert.Equal(41.0, reading.Humidity);
        Assert.Equal(800, reading.Co2Level);
        Assert.Equal(0.1, reading.SmokeLevel);
        Assert.Equal(28, reading.Tvoc);
        Assert.Equal(410, reading.Eco2);
        Assert.Equal(1, reading.Aqi);
        Assert.Equal("No Smoke", reading.Classification);
        Assert.Equal(3, reading.SensorId);
    }
}
