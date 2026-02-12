using Microsoft.Extensions.DependencyInjection;
using SIPPro.Application.Interfaces;
using SIPPro.Infrastructure.Services;

namespace SIPPro.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        // Register external integration services here (e.g., email, file storage, etc.)
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<ITokenService, TokenService>();

        return services;
    }
}
