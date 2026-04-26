namespace MainServer.Dtos;

public class PredictionDto
{
    public string PredictedCategory { get; set; } = "";
    public double ConfidenceScore { get; set; }
    public string RiskLevel { get; set; } = "";
}
