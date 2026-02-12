using Microsoft.EntityFrameworkCore;
using SIPPro.Application.DTOs.Auth;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;
using SIPPro.Domain.Enums;

namespace SIPPro.Application.Services;

public class AuthService : IAuthService
{
    private readonly ISipProDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthService(ISipProDbContext context, IPasswordHasher passwordHasher, ITokenService tokenService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // 1. Check if email exists
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            throw new Exception("Email sudah terdaftar.");
        }

        // 2. Create user (Default Role: None)
        var user = new User
        {
            FullName = request.FullName,
            NoInduk = request.NoInduk,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = UserRole.None, // Default role
            IsVerified = false // Needs verification
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(CancellationToken.None);
        
        return new AuthResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            AccessToken = "", // No token yet
            RefreshToken = ""
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        
        if (user == null || !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new Exception("Email atau kata sandi salah.");
        }

        if (!user.IsVerified)
        {
             throw new Exception("Akun belum diverifikasi. Silakan hubungi Admin.");
        }

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        
        await _context.SaveChangesAsync(CancellationToken.None);

        return new AuthResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };
    }

    public async Task VerifyUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new Exception("Pengguna tidak ditemukan");
        
        user.IsVerified = true;
        await _context.SaveChangesAsync(CancellationToken.None);
    }
}
