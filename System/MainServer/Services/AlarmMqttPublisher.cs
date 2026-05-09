using System.Threading;
using Microsoft.Extensions.Hosting;
using MQTTnet;
using MQTTnet.Client;

namespace MainServer.Services;

/// <summary>
/// Publishes ML-derived risk to MQTT so boards can sound the buzzer.
/// Payloads align with <see cref="MlServerThresholds"/> (MlServer /predict → riskLevel).
/// Topic: <c>iot/alarm/{sensorId}</c> — ASCII payloads: <c>CRITICAL</c>, <c>WARN</c>, <c>OFF</c>.
/// </summary>
public sealed class AlarmMqttPublisher : IAsyncDisposable
{
    private int _disposedFlag;
    private readonly ILogger<AlarmMqttPublisher> _logger;
    private readonly string _brokerHost;
    private readonly int _brokerPort;
    private readonly bool _publishMediumWarnings;
    private readonly SemaphoreSlim _mutex = new(1, 1);
    private readonly IMqttClient _client;
    private readonly MqttFactory _mqttFactory = new();

    public AlarmMqttPublisher(ILogger<AlarmMqttPublisher> logger)
    {
        _logger = logger;
        _brokerHost = Environment.GetEnvironmentVariable("ALARM_MQTT_HOST")?.Trim() ?? "";
        var portRaw = Environment.GetEnvironmentVariable("ALARM_MQTT_PORT");
        _brokerPort = int.TryParse(portRaw, out var p) ? p : 1883;
        _publishMediumWarnings = string.Equals(
            Environment.GetEnvironmentVariable("ALARM_PUBLISH_MEDIUM"),
            "true",
            StringComparison.OrdinalIgnoreCase);

        _client = _mqttFactory.CreateMqttClient();
    }

    public bool IsEnabled => !string.IsNullOrWhiteSpace(_brokerHost);

    /// <summary>
    /// Maps ML <paramref name="riskLevel"/> to MQTT payload. High = danger thresholds breached.
    /// </summary>
    public static string? MapRiskToPayload(string riskLevel, bool publishMediumWarnings)
    {
        return riskLevel switch
        {
            "High" => "CRITICAL",
            "Medium" => publishMediumWarnings ? "WARN" : null,
            "Low" => "OFF",
            _ => null,
        };
    }

    public async Task PublishRiskLevelAsync(int sensorId, string riskLevel, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || Volatile.Read(ref _disposedFlag) != 0)
            return;

        var payload = MapRiskToPayload(riskLevel, _publishMediumWarnings);
        if (payload is null)
            return;

        try
        {
            await _mutex.WaitAsync(cancellationToken).ConfigureAwait(false);
            try
            {
                if (!_client.IsConnected)
                {
                    var clientId = $"sep4-{Guid.NewGuid():N}";
                    if (clientId.Length > 23)
                        clientId = clientId[..23];

                    var options = new MqttClientOptionsBuilder()
                        .WithTcpServer(_brokerHost, _brokerPort)
                        .WithClientId(clientId)
                        .WithCleanSession()
                        .Build();

                    await _client.ConnectAsync(options, cancellationToken).ConfigureAwait(false);
                    _logger.LogInformation("Alarm MQTT connected to {Host}:{Port}", _brokerHost, _brokerPort);
                }

                var topic = $"iot/alarm/{sensorId}";
                var message = new MqttApplicationMessageBuilder()
                    .WithTopic(topic)
                    .WithPayload(payload)
                    .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtMostOnce)
                    .Build();

                await _client.PublishAsync(message, cancellationToken).ConfigureAwait(false);
            }
            finally
            {
                _mutex.Release();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Alarm MQTT publish failed for sensor {SensorId}, payload {Payload}", sensorId, payload);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposedFlag, 1) != 0)
            return;

        try
        {
            if (_client.IsConnected)
                await _client.DisconnectAsync().ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Alarm MQTT disconnect");
        }

        _client.Dispose();
        _mutex.Dispose();
    }
}

/// <summary>Disconnect MQTT cleanly on shutdown.</summary>
public sealed class AlarmMqttShutdownHostedService : IHostedService
{
    private readonly AlarmMqttPublisher _publisher;

    public AlarmMqttShutdownHostedService(AlarmMqttPublisher publisher)
    {
        _publisher = publisher;
    }

    public Task StartAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    public async Task StopAsync(CancellationToken cancellationToken) =>
        await _publisher.DisposeAsync().ConfigureAwait(false);
}
