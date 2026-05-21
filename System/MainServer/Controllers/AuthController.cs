using MainServer.Data;
using MainServer.Models;
using MainServer.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

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

    // ---------------- LOGIN ----------------
    public class LoginRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Username and password required");

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == req.Username);

        if (user == null)
            return Unauthorized("Invalid credentials");

        var passwordValid = BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash);

        if (!passwordValid)
            return Unauthorized("Invalid credentials");

        var token = _jwt.GenerateToken(user);

        return Ok(new
        {
            token,
            user = new
            {
                user.Id,
                user.Username,
                user.Role
            }
        });
    }

    // ---------------- REGISTER ----------------
    public class RegisterRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Username and password required");

        var exists = await _db.Users.AnyAsync(u => u.Username == req.Username);

        if (exists)
            return Conflict("Username already exists");

        var user = new User
        {
            Username = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "User"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = _jwt.GenerateToken(user);

        return Ok(new
        {
            token,
            user = new
            {
                user.Id,
                user.Username,
                user.Role
            }
        });
    }
}