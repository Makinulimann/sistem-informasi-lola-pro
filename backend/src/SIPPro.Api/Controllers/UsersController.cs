using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIPPro.Application.DTOs.User;
using SIPPro.Application.Interfaces;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Only Admins can manage users
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpPost("{id}/verify")]
    public async Task<IActionResult> VerifyUser(Guid id)
    {
        try
        {
            await _userService.VerifyUserAsync(id);
            return Ok(new { message = "Pengguna berhasil diverifikasi" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleRequest request)
    {
        try
        {
            await _userService.UpdateUserRoleAsync(id, request.Role);
            return Ok(new { message = "Peran pengguna berhasil diperbarui" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
