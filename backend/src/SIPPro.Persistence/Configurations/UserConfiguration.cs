using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SIPPro.Domain.Entities;

namespace SIPPro.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);
            
        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash);

        builder.Property(u => u.FullName)
            .HasMaxLength(100);

        builder.Property(u => u.NoInduk)
            .HasMaxLength(50);
            
        builder.Property(u => u.Role)
            .HasConversion<string>();
            
        builder.Property(u => u.RefreshToken);
        builder.Property(u => u.RefreshTokenExpiryTime);
    }
}
