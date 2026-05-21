namespace MainServer.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// "resident", "building-administrator", or "admin"
    /// </summary>
    public string Role { get; set; } = "resident";

    /// <summary>
    /// Residents are bound to one sensor. Null for admins / building-admins.
    /// </summary>
    public int? AssignedSensorId { get; set; }
}