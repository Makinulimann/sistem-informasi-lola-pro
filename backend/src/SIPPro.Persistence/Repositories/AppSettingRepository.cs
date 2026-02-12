using Microsoft.EntityFrameworkCore;
using SIPPro.Domain.Entities;
using SIPPro.Domain.Interfaces;

namespace SIPPro.Persistence.Repositories;

public sealed class AppSettingRepository : IAppSettingRepository
{
    private readonly SIPProDbContext _context;

    public AppSettingRepository(SIPProDbContext context)
    {
        _context = context;
    }

    public async Task<AppSetting?> GetByKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        return await _context.AppSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
    }

    public async Task<IReadOnlyList<AppSetting>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.AppSettings
            .AsNoTracking()
            .OrderBy(s => s.Key)
            .ToListAsync(cancellationToken);
    }
}
