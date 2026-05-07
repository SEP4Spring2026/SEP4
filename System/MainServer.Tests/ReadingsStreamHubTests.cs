using MainServer.Services;

namespace MainServer.Tests;

public class ReadingsStreamHubTests
{
    [Fact]
    public async Task Publish_DeliversToMatchingSubscriber()
    {
        var hub = new ReadingsStreamHub();
        var (_, reader) = hub.Subscribe(sensorId: 7);
        var evt = new ReadingStreamEvent(
            ReadingId: 11,
            Timestamp: DateTime.UtcNow,
            Temperature: 23.4,
            Humidity: 44.2,
            Co2Level: 510,
            SensorId: 7,
            Prediction: null);

        hub.Publish(evt);

        Assert.True(await reader.WaitToReadAsync());
        Assert.True(reader.TryRead(out var received));
        Assert.Equal(11, received.ReadingId);
        Assert.Equal(7, received.SensorId);
    }

    [Fact]
    public async Task Publish_DoesNotDeliverToDifferentSensorSubscriber()
    {
        var hub = new ReadingsStreamHub();
        var (_, reader) = hub.Subscribe(sensorId: 99);
        var evt = new ReadingStreamEvent(
            ReadingId: 12,
            Timestamp: DateTime.UtcNow,
            Temperature: 19.1,
            Humidity: 51.0,
            Co2Level: 430,
            SensorId: 7,
            Prediction: null);

        hub.Publish(evt);
        await Task.Delay(10);

        Assert.False(reader.TryRead(out _));
    }

    [Fact]
    public async Task Unsubscribe_CompletesReader()
    {
        var hub = new ReadingsStreamHub();
        var (subscriptionId, reader) = hub.Subscribe(sensorId: null);

        hub.Unsubscribe(subscriptionId);

        Assert.False(await reader.WaitToReadAsync());
    }
}
