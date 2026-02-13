using Microsoft.EntityFrameworkCore;
using SIPPro.Domain.Entities;

namespace SIPPro.Application.Interfaces;

public interface ISipProDbContext
{
    DbSet<AppSetting> AppSettings { get; set; }
    DbSet<User> Users { get; set; }
    DbSet<SidebarMenu> SidebarMenus { get; set; }
    DbSet<Perusahaan> Perusahaans { get; set; }
    DbSet<BahanBaku> BahanBakus { get; set; }
    DbSet<Material> Materials { get; set; }
    DbSet<BalanceStok> BalanceStoks { get; set; }
    DbSet<BalanceStokDetail> BalanceStokDetails { get; set; }
    DbSet<MasterItem> MasterItems { get; set; }
    DbSet<ProductMaterial> ProductMaterials { get; set; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
