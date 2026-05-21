using MainServer.Data;
using MainServer.Models;
using MainServer.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MainServer.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;

    public AuthController(AppDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/login
    // ─────────────────────────────────────────────
    public class LoginRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username and password required." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid username or password." });

        var token = _jwt.GenerateToken(user);

        return Ok(new
        {
            token,
            user = UserDto(user)
        });
    }

    // ─────────────────────────────────────────────
    // POST /api/auth/register
    // ─────────────────────────────────────────────
    public class RegisterRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Username and password required." });

        if (req.Password.Length < 6)
            return BadRequest(new { message = "Password must be at least 6 characters." });

        var exists = await _db.Users.AnyAsync(u => u.Username == req.Username);
        if (exists)
            return Conflict(new { message = "Username already exists." });

        var user = new User
        {
            Username = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "resident"   // all self-registered users start as residents
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwt.GenerateToken(user);

        return Ok(new
        {
            token,
            user = UserDto(user)
        });
    }

    // ─────────────────────────────────────────────
    // GET /api/auth/me  — returns current user from token
    // ─────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var idClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idClaim, out var userId))
            return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        return Ok(UserDto(user));
    }

    // ─────────────────────────────────────────────
    // GET /api/auth/users  — admin: list all users
    // ─────────────────────────────────────────────
    [HttpGet("users")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _db.Users
            .OrderBy(u => u.Id)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Role,
                u.AssignedSensorId
            })
            .ToListAsync();

        return Ok(users);
    }

    // ─────────────────────────────────────────────
    // PUT /api/auth/users/{id}/role  — admin: change role
    // ─────────────────────────────────────────────
    public class UpdateRoleRequest
    {
        public string Role { get; set; } = null!;
    }

    [HttpPut("users/{id}/role")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleRequest req)
    {
        var validRoles = new[] { "resident", "building-administrator", "admin" };
        var role = req.Role?.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(role) || !Array.Exists(validRoles, r => r == role))
            return BadRequest(new { message = $"Role must be one of: {string.Join(", ", validRoles)}" });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        // Prevent removing the last admin
        if (user.Role == "admin" && role != "admin")
        {
            var adminCount = await _db.Users.CountAsync(u => u.Role == "admin");
            if (adminCount <= 1)
                return BadRequest(new { message = "Cannot demote the last admin account." });
        }

        user.Role = role;
        await _db.SaveChangesAsync();

        return Ok(UserDto(user));
    }

    // ─────────────────────────────────────────────
    // PUT /api/auth/users/{id}/sensor  — admin: assign sensor to resident
    // ─────────────────────────────────────────────
    public class UpdateSensorRequest
    {
        public int? SensorId { get; set; }
    }

    [HttpPut("users/{id}/sensor")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateSensor(int id, [FromBody] UpdateSensorRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        user.AssignedSensorId = req.SensorId; // null = unassign
        await _db.SaveChangesAsync();

        return Ok(UserDto(user));
    }

    // ─────────────────────────────────────────────
    // DELETE /api/auth/users/{id}  — admin: delete user
    // ─────────────────────────────────────────────
    [HttpDelete("users/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Role == "admin")
        {
            var adminCount = await _db.Users.CountAsync(u => u.Role == "admin");
            if (adminCount <= 1)
                return BadRequest(new { message = "Cannot delete the last admin account." });
        }

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // ─────────────────────────────────────────────
    // Shared DTO helper
    // ─────────────────────────────────────────────
    private static object UserDto(User u) => new
    {
        u.Id,
        u.Username,
        u.Role,
        u.AssignedSensorId
    };
}