namespace MainServer.Models;

public class Prediction
{
    public int PredictionId { get; set; }
    public DateTime PredictionTime { get; set; }
    public string PredictedCategory { get; set; } = "";
    public double ConfidenceScore { get; set; }
    public string RiskLevel { get; set; } = "";

    public int ReadingId { get; set; }
    public SensorReading? Reading { get; set; }
}
