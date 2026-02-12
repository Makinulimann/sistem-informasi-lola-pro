using SIPPro.Domain.Entities;

namespace SIPPro.Application.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
}
