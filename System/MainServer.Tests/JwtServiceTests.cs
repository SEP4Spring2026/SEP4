using System.IdentityModel.Tokens.Jwt;
using MainServer.Models;
using MainServer.Services;
using Microsoft.Extensions.Configuration;

namespace MainServer.Tests;

public class JwtServiceTests
{
    [Fact]
    public void GenerateToken_IncludesSensorIdClaim_WhenUserHasAssignedSensor()
    {
        var previousJwtKey = Environment.GetEnvironmentVariable("JWT_KEY");
        Environment.SetEnvironmentVariable("JWT_KEY", "test-jwt-key-that-is-at-least-32-chars");

        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Issuer"] = "MainServer",
                    ["Jwt:Audience"] = "MainClient",
                    ["Jwt:ExpiryMinutes"] = "60"
                })
                .Build();

            var service = new JwtService(config);
            var token = service.GenerateToken(new User
            {
                Id = 7,
                Username = "resident1",
                Role = "resident",
                AssignedSensorId = 101
            });

            var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

            Assert.Contains(jwt.Claims, claim => claim.Type == "SensorId" && claim.Value == "101");
        }
        finally
        {
            Environment.SetEnvironmentVariable("JWT_KEY", previousJwtKey);
        }
    }
}
