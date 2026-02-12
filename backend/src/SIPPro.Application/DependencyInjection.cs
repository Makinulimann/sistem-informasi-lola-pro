using Microsoft.Extensions.DependencyInjection;
using SIPPro.Application.Interfaces;
using SIPPro.Application.Services;

namespace SIPPro.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IHealthService, HealthService>();
        services.AddScoped<IAppSettingService, AppSettingService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>(); // Added

        return services;
    }
}
