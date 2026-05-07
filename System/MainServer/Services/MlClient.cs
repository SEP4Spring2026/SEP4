using System.Net.Http.Json;
using MainServer.Dtos;
using MainServer.Models;

namespace MainServer.Services;

public class MlClient
{
    private readonly HttpClient _http;
    private const int MaxAttempts = 2;

    public MlClient(HttpClient http)
    {
        _http = http;
    }

    public async Task<PredictionDto> PredictAsync(SensorReading reading, CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            temperature = reading.Temperature,
            humidity = reading.Humidity,
            co2Level = reading.Co2Level
        };

        HttpResponseMessage? response = null;
        Exception? lastException = null;

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                response = await _http.PostAsJsonAsync("/predict", payload, cancellationToken);
                response.EnsureSuccessStatusCode();
                break;
            }
            catch (Exception ex) when (attempt < MaxAttempts)
            {
                lastException = ex;
                await Task.Delay(TimeSpan.FromMilliseconds(150), cancellationToken);
            }
        }

        if (response is null)
        {
            throw new HttpRequestException("ML prediction request failed.", lastException);
        }

        var result = await response.Content.ReadFromJsonAsync<PredictionDto>(cancellationToken: cancellationToken);
        return result!;
    }
}
