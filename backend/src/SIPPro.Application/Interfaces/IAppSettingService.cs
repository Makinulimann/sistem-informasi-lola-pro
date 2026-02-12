using SIPPro.Application.DTOs;

namespace SIPPro.Application.Interfaces;

public interface IAppSettingService
{
    Task<AppSettingDto?> GetByKeyAsync(string key, CancellationToken cancellationToken = default);
}
