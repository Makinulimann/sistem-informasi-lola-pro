using Microsoft.EntityFrameworkCore;
using SIPPro.Domain.Entities;

namespace SIPPro.Application.Interfaces;

public interface ISipProDbContext
{
    DbSet<AppSetting> AppSettings { get; set; }
    DbSet<User> Users { get; set; }
    DbSet<SidebarMenu> SidebarMenus { get; set; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
