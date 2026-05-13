using System.Collections.Concurrent;
using System.Threading.Channels;

namespace MainServer.Services;

public record ReadingStreamEvent(
    int ReadingId,
    DateTime Timestamp,
    double Temperature,
    double Humidity,
    double Co2Level,
    double? Tvoc,
    double? Eco2,
    int? Aqi,
    string? Classification,
    int SensorId,
    object? Prediction
);

public class ReadingsStreamHub
{
    private sealed record Subscription(int? SensorId, Channel<ReadingStreamEvent> Channel);

    private readonly ConcurrentDictionary<Guid, Subscription> _subscriptions = new();

    public (Guid SubscriptionId, ChannelReader<ReadingStreamEvent> Reader) Subscribe(int? sensorId)
    {
        var channel = Channel.CreateUnbounded<ReadingStreamEvent>();
        var id = Guid.NewGuid();
        _subscriptions[id] = new Subscription(sensorId, channel);
        return (id, channel.Reader);
    }

    public void Unsubscribe(Guid subscriptionId)
    {
        if (_subscriptions.TryRemove(subscriptionId, out var sub))
        {
            sub.Channel.Writer.TryComplete();
        }
    }

    public void Publish(ReadingStreamEvent streamEvent)
    {
        foreach (var (_, sub) in _subscriptions)
        {
            if (sub.SensorId.HasValue && sub.SensorId.Value != streamEvent.SensorId)
            {
                continue;
            }

            sub.Channel.Writer.TryWrite(streamEvent);
        }
    }
}
