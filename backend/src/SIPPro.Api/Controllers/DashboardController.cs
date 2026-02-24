using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public DashboardController(ISipProDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns summary data for all products under a category.
    /// </summary>
    [HttpGet("category-summary")]
    public async Task<IActionResult> GetCategorySummary(
        [FromQuery] string category,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        if (string.IsNullOrWhiteSpace(category))
            return BadRequest("category is required.");

        var now = DateTime.UtcNow.AddHours(7);
        var targetBulan = bulan ?? now.Month;
        var targetTahun = tahun ?? now.Year;

        // ═══ 1. Discover products from sidebar ═══
        var categorySlug = category.ToLower();
        var allMenus = await _context.SidebarMenus
            .Where(m => m.IsActive && m.Href != "#")
            .ToListAsync();

        var productSlugs = allMenus
            .Where(m => m.Href.Contains($"/dashboard/{categorySlug}/"))
            .Select(m =>
            {
                var parts = m.Href.Split('/').Where(s => !string.IsNullOrEmpty(s)).ToArray();
                return parts.Length >= 3 ? parts[2] : null;
            })
            .Where(s => s != null)
            .Distinct()
            .ToList();

        if (productSlugs.Count == 0)
            return Ok(new { category = TitleCase(category), bulan = targetBulan, tahun = targetTahun, products = new object[0] });

        // ═══ 2. Find product labels ═══
        var productLabels = new Dictionary<string, string>();
        foreach (var menu in allMenus)
        {
            foreach (var slug in productSlugs)
            {
                if (menu.Href.Contains($"/{slug}/"))
                {
                    var parent = allMenus.FirstOrDefault(m => m.Id == menu.ParentId);
                    if (parent != null && !productLabels.ContainsKey(slug!))
                        productLabels[slug!] = parent.Label;
                }
            }
        }

        // ═══ 3. Aggregate data per product ═══
        var utcOffset = TimeSpan.FromHours(7);
        var localStart = new DateTime(targetTahun, targetBulan, 1);
        var localEnd = localStart.AddMonths(1);
        var startUtc = DateTime.SpecifyKind(localStart.Add(-utcOffset), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(localEnd.Add(-utcOffset), DateTimeKind.Utc);

        var results = new List<object>();

        foreach (var slug in productSlugs)
        {
            if (slug == null) continue;

            // ── Material Balance (with proper unit conversion) ──
            var configuredMaterials = await _context.ProductMaterials
                .Include(pm => pm.MasterItem)
                .Where(pm => pm.ProductSlug == slug)
                .OrderBy(pm => pm.Jenis)
                .ThenBy(pm => pm.MasterItem != null ? pm.MasterItem.Nama : "")
                .ToListAsync();

            var configuredNames = configuredMaterials
                .Select(pm => pm.MasterItem?.Nama ?? "")
                .Where(n => !string.IsNullOrEmpty(n))
                .ToList();

            var materialRecords = configuredNames.Count > 0
                ? await _context.BahanBakus
                    .Where(b => configuredNames.Contains(b.NamaBahan))
                    .ToListAsync()
                : new List<SIPPro.Domain.Entities.BahanBaku>();

            var materialSummary = configuredMaterials.Select(pm =>
            {
                var name = pm.MasterItem?.Nama ?? "";
                var satuan = pm.MasterItem?.SatuanDefault ?? "Kg";
                var records = materialRecords
                    .Where(r => r.NamaBahan.Equals(name, StringComparison.OrdinalIgnoreCase))
                    .ToList();

                // Period filter
                var periodRecords = records
                    .Where(r => r.Tanggal >= startUtc && r.Tanggal < endUtc)
                    .ToList();

                // Convert each record's unit to the target satuan
                var totalIn = periodRecords
                    .Where(r => r.Tipe == "Suplai")
                    .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));
                var totalOut = periodRecords
                    .Where(r => r.Tipe == "Mutasi")
                    .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));

                // Cumulative stock (all-time up to end of period)
                var cumIn = records
                    .Where(r => r.Tanggal < endUtc && r.Tipe == "Suplai")
                    .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));
                var cumOut = records
                    .Where(r => r.Tanggal < endUtc && r.Tipe == "Mutasi")
                    .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));

                return new
                {
                    nama = name,
                    jenis = pm.Jenis,
                    satuan,
                    suplai = totalIn,
                    mutasi = totalOut,
                    stok = cumIn - cumOut
                };
            }).ToList();

            // ── Production Summary ──
            var tabs = await _context.ProduksiTabs
                .Where(t => t.ProductSlug == slug)
                .ToListAsync();

            var produksiRecords = await _context.Produksis
                .Where(p => p.ProductSlug == slug
                         && p.Tanggal >= startUtc
                         && p.Tanggal < endUtc)
                .ToListAsync();

            double totalBS = 0, totalPG = 0;
            var tabSummaries = tabs.Select(tab =>
            {
                var tabRecords = produksiRecords
                    .Where(r => r.ProduksiTabId == tab.Id)
                    .ToList();
                var bs = tabRecords.Sum(r => r.BS);
                var ps = tabRecords.Sum(r => r.PS);
                var pg = tabRecords.Sum(r => r.PG);
                var coa = tabRecords.Sum(r => r.COA);
                totalBS += bs;
                totalPG += pg;
                return new
                {
                    tabName = tab.Nama,
                    totalProduksi = bs, // keeping it for backward compatibility or alias
                    belumSampling = bs,
                    prosesSampling = ps,
                    pengirimanGudang = pg,
                    coa
                };
            }).ToList();

            results.Add(new
            {
                slug,
                label = productLabels.GetValueOrDefault(slug, TitleCase(slug)),
                materials = materialSummary,
                production = new
                {
                    tabs = tabSummaries,
                    totalProduksi = totalBS, // legacy alias
                    totalBelumSampling = totalBS,
                    totalProsesSampling = tabSummaries.Sum(t => t.prosesSampling),
                    totalPengiriman = totalPG,
                    stokAkhir = totalBS - totalPG
                }
            });
        }

        return Ok(new
        {
            category = TitleCase(category),
            bulan = targetBulan,
            tahun = targetTahun,
            products = results
        });
    }

    /// <summary>
    /// Returns list of available categories from sidebar.
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        // Level 1 menus with children = categories
        var allMenus = await _context.SidebarMenus
            .Where(m => m.IsActive)
            .OrderBy(m => m.Order)
            .ToListAsync();

        var topLevel = allMenus
            .Where(m => m.ParentId == null)
            .ToList();

        var categories = new List<object>();
        foreach (var top in topLevel)
        {
            // Check if this has children with sub-children (product structure)
            var children = allMenus.Where(m => m.ParentId == top.Id).ToList();
            var hasProducts = children.Any(c => allMenus.Any(s => s.ParentId == c.Id));
            if (!hasProducts) continue;

            // Derive slug from first grandchild's href
            var firstGrandChild = children
                .SelectMany(c => allMenus.Where(s => s.ParentId == c.Id))
                .FirstOrDefault(m => m.Href != "#");

            string? categorySlug = null;
            if (firstGrandChild != null)
            {
                var parts = firstGrandChild.Href.Split('/').Where(s => !string.IsNullOrEmpty(s)).ToArray();
                if (parts.Length >= 2) categorySlug = parts[1];
            }

            if (categorySlug != null)
            {
                categories.Add(new
                {
                    slug = categorySlug,
                    label = top.Label,
                    icon = top.Icon,
                    productCount = children.Count
                });
            }
        }

        return Ok(categories);
    }

    // ═══ Unit Conversion (same logic as BahanBakuController) ═══
    private static double ConvertUnit(double value, string fromUnit, string toUnit)
    {
        if (string.Equals(fromUnit, toUnit, StringComparison.OrdinalIgnoreCase)) return value;

        var from = fromUnit?.Trim().ToLower() ?? "";
        var to = toUnit?.Trim().ToLower() ?? "";

        string Normalize(string u) => u switch
        {
            "l" => "liter", "lt" => "liter", "litre" => "liter",
            "milliliter" => "ml", "millilitre" => "ml", "cc" => "ml",
            "kilo" => "kg", "kilogram" => "kg",
            "gr" => "gram", "g" => "gram",
            _ => u
        };
        from = Normalize(from);
        to = Normalize(to);

        // Mass (base: Kg)
        double ToKg(double val, string u) => u switch
        {
            "ton" => val * 1000, "kwintal" => val * 100, "kg" => val,
            "gram" => val / 1000, "mg" => val / 1000000, _ => val
        };
        double FromKg(double val, string u) => u switch
        {
            "ton" => val / 1000, "kwintal" => val / 100, "kg" => val,
            "gram" => val * 1000, "mg" => val * 1000000, _ => val
        };

        // Volume (base: Liter)
        double ToLiter(double val, string u) => u switch
        {
            "kl" => val * 1000, "liter" => val, "ml" => val / 1000, _ => val
        };
        double FromLiter(double val, string u) => u switch
        {
            "kl" => val / 1000, "liter" => val, "ml" => val * 1000, _ => val
        };

        var massUnits = new[] { "ton", "kwintal", "kg", "gram", "mg" };
        var volUnits = new[] { "kl", "liter", "ml" };

        if (massUnits.Contains(from) && massUnits.Contains(to))
            return FromKg(ToKg(value, from), to);

        if (volUnits.Contains(from) && volUnits.Contains(to))
            return FromLiter(ToLiter(value, from), to);

        return value;
    }

    private static string TitleCase(string s)
    {
        return string.Join(' ',
            s.Replace("-", " ")
             .Split(' ')
             .Select(w => w.Length > 0 ? char.ToUpper(w[0]) + w[1..] : w));
    }
}
