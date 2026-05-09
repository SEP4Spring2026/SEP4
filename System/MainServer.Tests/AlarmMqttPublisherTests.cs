using MainServer.Services;

namespace MainServer.Tests;

public class AlarmMqttPublisherTests
{
    [Fact]
    public void MapRiskToPayload_High_IsCritical() =>
        Assert.Equal("CRITICAL", AlarmMqttPublisher.MapRiskToPayload("High", false));

    [Fact]
    public void MapRiskToPayload_Low_IsOff() =>
        Assert.Equal("OFF", AlarmMqttPublisher.MapRiskToPayload("Low", false));

    [Fact]
    public void MapRiskToPayload_Medium_OnlyWhenFlag() =>
        Assert.Equal("WARN", AlarmMqttPublisher.MapRiskToPayload("Medium", true));

    [Fact]
    public void MapRiskToPayload_Medium_SkippedWithoutFlag() =>
        Assert.Null(AlarmMqttPublisher.MapRiskToPayload("Medium", false));

    [Theory]
    [InlineData("critical", "CRITICAL")]
    [InlineData("WARN", "WARN")]
    [InlineData("silence", "OFF")]
    public void NormalizeAlarmTestLevel_AcceptsAliases(string input, string expected) =>
        Assert.Equal(expected, AlarmMqttPublisher.NormalizeAlarmTestLevel(input));

    [Fact]
    public void NormalizeAlarmTestLevel_Invalid_ReturnsNull() =>
        Assert.Null(AlarmMqttPublisher.NormalizeAlarmTestLevel("nope"));
}
