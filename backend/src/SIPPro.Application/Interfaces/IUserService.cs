using SIPPro.Application.DTOs.User;

namespace SIPPro.Application.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task VerifyUserAsync(Guid userId);
    Task UpdateUserRoleAsync(Guid userId, string newRole);
}
