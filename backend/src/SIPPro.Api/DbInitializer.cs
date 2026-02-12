using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using SIPPro.Domain.Entities;
using SIPPro.Domain.Enums;
using SIPPro.Application.Interfaces;
using SIPPro.Persistence;

namespace SIPPro.Api.Data;

public static class DbInitializer
{
    public static async Task Initialize(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SIPProDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        // Ensure database is created/migrated
        await context.Database.MigrateAsync();

        // Seed Admin User
        var adminEmail = "admin@example.com";
        if (!await context.Users.AnyAsync(u => u.Email == adminEmail))
        {
            var adminUser = new User
            {
                Email = adminEmail,
                FullName = "Administrator",
                NoInduk = "00000",
                Role = UserRole.Admin,
                IsVerified = true,
                PasswordHash = passwordHasher.HashPassword("admin@112"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
    }
}
