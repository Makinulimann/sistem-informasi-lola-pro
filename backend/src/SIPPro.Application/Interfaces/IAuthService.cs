using SIPPro.Application.DTOs.Auth;
using SIPPro.Domain.Entities;

namespace SIPPro.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task VerifyUserAsync(Guid userId); // Admin only
}
