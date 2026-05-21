using MainServer.Data;
using MainServer.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MainServer.Controllers;

/// <summary>
/// User management — system admin only.
/// Endpoints: list users, change role, delete user.
/// </summary>
[ApiController]
[Route("api/users")]
[Authorize(Policy = "SystemAdmin")]
public class UsersController : ControllerBase
{
    private static readonly HashSet<string> ValidRoles =
        new(StringComparer.OrdinalIgnoreCase) { "resident", "building-administrator", "admin" };

    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    // GET /api/users
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _db.Users
            .OrderBy(u => u.Id)
            .Select(u => new { u.Id, u.Username, u.Role })
            .ToListAsync();

        return Ok(users);
    }

    // GET /api/users/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });
        return Ok(new { user.Id, user.Username, user.Role });
    }

    // PUT /api/users/{id}/role   body: { "role": "building-administrator" }
    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeRoleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Role) || !ValidRoles.Contains(req.Role))
            return BadRequest(new { message = $"Invalid role. Must be one of: {string.Join(", ", ValidRoles)}." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        // Prevent a system admin from demoting themselves
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(callerId, out var callerIdInt) && callerIdInt == id && req.Role != "admin")
            return BadRequest(new { message = "You cannot demote your own account." });

        user.Role = req.Role.ToLowerInvariant();
        await _db.SaveChangesAsync();

        return Ok(new { user.Id, user.Username, user.Role });
    }

    // DELETE /api/users/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(callerId, out var callerIdInt) && callerIdInt == id)
            return BadRequest(new { message = "You cannot delete your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    public class ChangeRoleRequest
    {
        public string Role { get; set; } = null!;
    }
}