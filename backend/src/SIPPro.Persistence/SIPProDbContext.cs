using Microsoft.EntityFrameworkCore;
using SIPPro.Domain.Entities;
using System.Reflection;

using SIPPro.Application.Interfaces;

namespace SIPPro.Persistence;

public class SIPProDbContext : DbContext, ISipProDbContext
{
    public SIPProDbContext(DbContextOptions<SIPProDbContext> options)
        : base(options)
    {
    }

    public DbSet<AppSetting> AppSettings { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<SidebarMenu> SidebarMenus { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SIPProDbContext).Assembly);
    }
}
