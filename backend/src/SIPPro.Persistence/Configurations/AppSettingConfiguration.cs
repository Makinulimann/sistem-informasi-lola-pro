using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SIPPro.Domain.Entities;

namespace SIPPro.Persistence.Configurations;

public class AppSettingConfiguration : IEntityTypeConfiguration<AppSetting>
{
    public void Configure(EntityTypeBuilder<AppSetting> builder)
    {
        builder.ToTable("app_settings");

        builder.HasKey(e => e.Key);

        builder.Property(e => e.Key)
            .HasColumnName("key")
            .HasMaxLength(256)
            .IsRequired();

        builder.Property(e => e.Value)
            .HasColumnName("value")
            .HasMaxLength(2048)
            .IsRequired();

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .IsRequired();

        // Seed data
        builder.HasData(new AppSetting
        {
            Key = "app-name",
            Value = "SIPPro",
            UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}
