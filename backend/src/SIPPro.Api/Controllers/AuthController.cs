using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SIPPro.Application.DTOs.Auth;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;
using SIPPro.Domain.Enums;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            return Ok(new { message = "Registration successful. Please wait for admin verification.", user = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("verify/{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> VerifyUser(Guid userId)
    {
        try
        {
            await _authService.VerifyUserAsync(userId);
            return Ok(new { message = "User verified successfully." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    
    [HttpGet("me")]
    [Authorize]
    public IActionResult GetMe()
    {
        var user = new
        {
            Id = User.FindFirst("sub")?.Value,
            Email = User.FindFirst("email")?.Value,
            Role = User.FindFirst("role")?.Value,
            FullName = User.FindFirst("fullName")?.Value,
            NoInduk = User.FindFirst("noInduk")?.Value
        };
        
        return Ok(user);
    }
}
