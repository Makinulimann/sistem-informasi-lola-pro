using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SIPPro.Domain.Interfaces;
using SIPPro.Persistence.Repositories;

using SIPPro.Application.Interfaces;

namespace SIPPro.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<SIPProDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<ISipProDbContext>(provider => provider.GetRequiredService<SIPProDbContext>());

        services.AddScoped<IAppSettingRepository, AppSettingRepository>();

        return services;
    }
}
