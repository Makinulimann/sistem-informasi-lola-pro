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
    public DbSet<Perusahaan> Perusahaans { get; set; }
    public DbSet<BahanBaku> BahanBakus { get; set; }
    public DbSet<Material> Materials { get; set; }
    public DbSet<BalanceStok> BalanceStoks { get; set; }
    public DbSet<BalanceStokDetail> BalanceStokDetails { get; set; }
    public DbSet<MasterItem> MasterItems { get; set; }
    public DbSet<ProductMaterial> ProductMaterials { get; set; }
    public DbSet<ProduksiTab> ProduksiTabs { get; set; }
    public DbSet<Produksi> Produksis { get; set; }
    public DbSet<AktivitasHarian> AktivitasHarians { get; set; }
    public DbSet<LogbookPic> LogbookPics { get; set; }
    public DbSet<LogbookLokasi> LogbookLokasis { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SIPProDbContext).Assembly);
    }
}
