using System.Net.Http.Json;
using MainServer.Dtos;
using MainServer.Models;

namespace MainServer.Services;

public class MlClient
{
    private readonly HttpClient _http;

    public MlClient(HttpClient http)
    {
        _http = http;
    }

    public async Task<PredictionDto> PredictAsync(SensorReading reading)
    {
        var payload = new
        {
            temperature = reading.Temperature,
            humidity = reading.Humidity,
            co2Level = reading.Co2Level
        };

        var response = await _http.PostAsJsonAsync("/predict", payload);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<PredictionDto>();
        return result!;
    }
}
