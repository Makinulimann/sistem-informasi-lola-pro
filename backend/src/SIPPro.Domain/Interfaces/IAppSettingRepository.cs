using SIPPro.Domain.Entities;

namespace SIPPro.Domain.Interfaces;

public interface IAppSettingRepository
{
    Task<AppSetting?> GetByKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AppSetting>> GetAllAsync(CancellationToken cancellationToken = default);
}
