using SIPPro.Application.DTOs;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Interfaces;

namespace SIPPro.Application.Services;

public sealed class AppSettingService : IAppSettingService
{
    private readonly IAppSettingRepository _repository;

    public AppSettingService(IAppSettingRepository repository)
    {
        _repository = repository;
    }

    public async Task<AppSettingDto?> GetByKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByKeyAsync(key, cancellationToken);

        if (entity is null)
            return null;

        return new AppSettingDto(
            Key: entity.Key,
            Value: entity.Value
        );
    }
}
