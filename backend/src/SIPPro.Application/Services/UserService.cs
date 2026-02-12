using Microsoft.EntityFrameworkCore;
using SIPPro.Application.DTOs.User;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;
using SIPPro.Domain.Enums;

namespace SIPPro.Application.Services;

public class UserService : IUserService
{
    private readonly ISipProDbContext _context;

    public UserService(ISipProDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return users.Select(u => new UserDto
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            NoInduk = u.NoInduk,
            Role = u.Role.ToString(),
            IsVerified = u.IsVerified,
            CreatedAt = u.CreatedAt
        });
    }

    public async Task VerifyUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new Exception("Pengguna tidak ditemukan");
        }

        user.IsVerified = true;
        await _context.SaveChangesAsync(CancellationToken.None);
    }

    public async Task UpdateUserRoleAsync(Guid userId, string newRole)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            throw new Exception("Pengguna tidak ditemukan");
        }

        if (!Enum.TryParse<UserRole>(newRole, true, out var roleEnum))
        {
            throw new Exception("Peran tidak valid");
        }

        user.Role = roleEnum;
        await _context.SaveChangesAsync(CancellationToken.None);
    }
}
