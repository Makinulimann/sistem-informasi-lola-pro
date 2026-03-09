using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProduksiController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public ProduksiController(ISipProDbContext context)
    {
        _context = context;
    }

    // ═══════════════════════════════════════
    //  Tabs (configurable product variant tabs)
    // ═══════════════════════════════════════

    [HttpGet("tabs")]
    public async Task<IActionResult> GetTabs([FromQuery] string productSlug)
    {
        var tabs = await _context.ProduksiTabs
            .Where(t => t.ProductSlug == productSlug)
            .OrderBy(t => t.Order)
            .Select(t => new { t.Id, t.Nama, t.Order })
            .ToListAsync();

        return Ok(tabs);
    }

    [HttpPost("tabs")]
    public async Task<IActionResult> CreateTab([FromBody] CreateTabRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProductSlug) || string.IsNullOrWhiteSpace(request.Nama))
            return BadRequest("ProductSlug dan Nama wajib diisi.");

        var maxOrder = await _context.ProduksiTabs
            .Where(t => t.ProductSlug == request.ProductSlug)
            .MaxAsync(t => (int?)t.Order) ?? 0;

        var tab = new ProduksiTab
        {
            ProductSlug = request.ProductSlug,
            Nama = request.Nama.Trim(),
            Order = maxOrder + 1
        };

        _context.ProduksiTabs.Add(tab);
        await (_context as DbContext)!.SaveChangesAsync();

        return Ok(new { tab.Id, tab.Nama, tab.Order });
    }

    [HttpPut("tabs/{id}")]
    public async Task<IActionResult> RenameTab(int id, [FromBody] RenameTabRequest request)
    {
        var tab = await _context.ProduksiTabs.FindAsync(id);
        if (tab == null) return NotFound();

        tab.Nama = request.Nama.Trim();
        await (_context as DbContext)!.SaveChangesAsync();

        return Ok(new { tab.Id, tab.Nama, tab.Order });
    }

    [HttpDelete("tabs/{id}")]
    public async Task<IActionResult> DeleteTab(int id)
    {
        var tab = await _context.ProduksiTabs.FindAsync(id);
        if (tab == null) return NotFound();

        var records = await _context.Produksis
            .Where(p => p.ProduksiTabId == id)
            .ToListAsync();
        _context.Produksis.RemoveRange(records);

        _context.ProduksiTabs.Remove(tab);
        await (_context as DbContext)!.SaveChangesAsync();

        return NoContent();
    }

    // ═══════════════════════════════════════
    //  Production Data (daily records)
    // ═══════════════════════════════════════

    [HttpGet]
    public async Task<IActionResult> GetProduksi(
        [FromQuery] string productSlug,
        [FromQuery] int? tabId,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        if (string.IsNullOrWhiteSpace(productSlug))
            return BadRequest("productSlug is required.");

        if (!tabId.HasValue || !bulan.HasValue || !tahun.HasValue)
        {
            // Fallback for missing filters (optional: return empty or error)
            return Ok(new { summary = new { }, data = new object[] { } });
        }

        // 1. Fetch existing records for the month
        var utcOffset = TimeSpan.FromHours(7);
        var localStart = new DateTime(tahun.Value, bulan.Value, 1);
        var localEnd = localStart.AddMonths(1);
        var startUtc = DateTime.SpecifyKind(localStart.Add(-utcOffset), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(localEnd.Add(-utcOffset), DateTimeKind.Utc);

        var dbRecords = await _context.Produksis
            .Where(p => p.ProductSlug == productSlug &&
                        p.ProduksiTabId == tabId.Value &&
                        p.Tanggal >= startUtc && p.Tanggal < endUtc)
            .ToListAsync();

        // 2. Generate full month grid
        var daysInMonth = DateTime.DaysInMonth(tahun.Value, bulan.Value);
        var fullList = new List<ProduksiRowDto>();
        
        // Running totals (reset monthly for now)
        double runningKumulatif = 0;
        double runningStok = 0;

        for (int day = 1; day <= daysInMonth; day++)
        {
            var date = new DateTime(tahun.Value, bulan.Value, day);
            // Match loosely by checking if date falls in same day (converting UTC-stored back to local)
            // Or simpler: define date range for that day.
            // Since we stored with specific date logic, let's match carefully.
            // Best is to use the stored Date.
            // Let's assume we store "Midnight Local Time - Offset" = "Previous Day 17:00 UTC".
            // So to match Day X, we look for db record where (Tanggal + 7h).Date == date.
            
            var match = dbRecords.FirstOrDefault(r => r.Tanggal.Add(utcOffset).Date == date.Date);

            // Values
            double bs = match?.BS ?? 0;
            double ps = match?.PS ?? 0;
            double coa = match?.COA ?? 0;
            double pg = match?.PG ?? 0;
            string ket = match?.Keterangan ?? "";
            int id = match?.Id ?? 0;

            // Recalculate Logic:
            // Kumulatif = running sum of BS (total production)
            // Stok Akhir = running sum of (BS - PG)
            runningKumulatif += bs;
            runningStok += (bs - pg);

            fullList.Add(new ProduksiRowDto
            {
                Id = id,
                Tanggal = date.ToString("yyyy-MM-dd"),
                BS = bs,
                PS = ps,
                COA = coa,
                PG = pg,
                Kumulatif = runningKumulatif,
                StokAkhir = runningStok,
                Keterangan = ket
            });
        }

        // Summary
        var summary = new
        {
            totalProduksi = fullList.Sum(x => x.BS),
            totalKeluar = fullList.Sum(x => x.PG),
            kumulatif = runningKumulatif,
            stokAkhir = runningStok
        };

        return Ok(new { summary, data = fullList });
    }

    [HttpPost]
    public async Task<IActionResult> SaveProduksi([FromBody] SaveProduksiRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ProductSlug) || req.TabId <= 0)
            return BadRequest("Invalid request.");

        // Parse Date
        if (!DateTime.TryParse(req.Tanggal, out var localDate))
            return BadRequest("Invalid date format.");

        var utcOffset = TimeSpan.FromHours(7);
        var targetUtc = DateTime.SpecifyKind(localDate.Date.Add(-utcOffset), DateTimeKind.Utc);

        // Find existing or create
        var record = await _context.Produksis
            .FirstOrDefaultAsync(p => p.ProduksiTabId == req.TabId && p.Tanggal == targetUtc);

        if (record == null)
        {
            record = new Produksi
            {
                ProductSlug = req.ProductSlug,
                ProduksiTabId = req.TabId,
                Tanggal = targetUtc
            };
            _context.Produksis.Add(record);
        }

        // Update fields
        record.BS = req.BS;
        record.PS = req.PS;
        record.COA = req.COA;
        record.PG = req.PG;
        record.Keterangan = req.Keterangan ?? "";
        
        // Note: We are NOT recalculating and saving Kumulatif/StokAkhir here for ALL rows.
        // We rely on GET to recalculate on the fly for display. 
        // We only save the input values (BS, COA, PG).
        // The entities `Kumulatif` and `StokAkhir` fields might become stale or unused in DB 
        // if we only compute on read.
        // If we want to persist them correctly, we'd need to re-fetch the whole month and update.
        // For now, let's just save the inputs. 
        // The "Kumulatif" and "StokAkhir" columns in DB will just store the values for THIS day 
        // (computed locally) or be ignored. 
        // Let's compute local snapshot and save it, just in case.
        
        // ... Logic ... 
        // Actually simplest is just to save inputs. Get logic handles the rest.
        
        await (_context as DbContext)!.SaveChangesAsync();

        return Ok(new { success = true });
    }

    // ═══════════════════════════════════════
    //  Save Produksi + Materials (combined)
    // ═══════════════════════════════════════

    [HttpPost("with-materials")]
    public async Task<IActionResult> SaveProduksiWithMaterials([FromBody] SaveWithMaterialsRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ProductSlug) || req.TabId <= 0)
            return BadRequest("Invalid request.");

        if (!DateTime.TryParse(req.Tanggal, out var localDate))
            return BadRequest("Invalid date format.");

        var utcOffset = TimeSpan.FromHours(7);
        var targetUtc = DateTime.SpecifyKind(localDate.Date.Add(-utcOffset), DateTimeKind.Utc);

        // 1. Upsert Produksi record
        var record = await _context.Produksis
            .FirstOrDefaultAsync(p => p.ProduksiTabId == req.TabId && p.Tanggal == targetUtc);

        if (record == null)
        {
            record = new Produksi
            {
                ProductSlug = req.ProductSlug,
                ProduksiTabId = req.TabId,
                Tanggal = targetUtc
            };
            _context.Produksis.Add(record);
        }

        record.BS = req.BS;
        record.Keterangan = req.Keterangan ?? "";

        // 2. Delete existing Mutasi records for this product + date (edit mode)
        var existingMutasi = await _context.BahanBakus
            .Where(b => b.ProductSlug == req.ProductSlug
                     && b.Tipe == "Mutasi"
                     && b.Tanggal == targetUtc
                     && b.Keterangan != null
                     && (b.Keterangan.StartsWith("Produksi ") || b.Keterangan.StartsWith("produksi ")))
            .ToListAsync();
        _context.BahanBakus.RemoveRange(existingMutasi);

        // 3. Create new Mutasi records for each material used
        var mutasiRecords = new List<object>();
        if (req.Materials != null)
        {
            var productLabel = !string.IsNullOrWhiteSpace(req.ProductFullName) ? req.ProductFullName : req.ProductSlug;
            var bsFormatted = req.BS % 1 == 0 ? req.BS.ToString("F0") : req.BS.ToString("G");
            foreach (var mat in req.Materials)
            {
                if (mat.Kuantum <= 0) continue;

                var entity = new BahanBaku
                {
                    Tipe = "Mutasi",
                    ProductSlug = req.ProductSlug,
                    Tanggal = targetUtc,
                    Jenis = mat.Jenis,
                    NamaBahan = mat.NamaBahan,
                    Kuantum = mat.Kuantum,
                    Satuan = mat.Satuan ?? "Kg",
                    Dokumen = "",
                    Keterangan = $"produksi {productLabel} sejumlah {bsFormatted}"
                };
                _context.BahanBakus.Add(entity);
                mutasiRecords.Add(new
                {
                    entity.NamaBahan,
                    entity.Kuantum,
                    entity.Satuan,
                    entity.Jenis
                });
            }
        }

        await (_context as DbContext)!.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            produksiBs = record.BS,
            mutasiCount = mutasiRecords.Count,
            mutasi = mutasiRecords
        });
    }

    // ═══════════════════════════════════════
    //  Cancel Produksi + Materials (undo)
    // ═══════════════════════════════════════

    [HttpPost("cancel-with-materials")]
    public async Task<IActionResult> CancelProduksiWithMaterials([FromBody] CancelWithMaterialsRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ProductSlug) || req.TabId <= 0)
            return BadRequest("Invalid request.");

        if (!DateTime.TryParse(req.Tanggal, out var localDate))
            return BadRequest("Invalid date format.");

        var utcOffset = TimeSpan.FromHours(7);
        var targetUtc = DateTime.SpecifyKind(localDate.Date.Add(-utcOffset), DateTimeKind.Utc);

        // 1. Reset produksi BS to 0
        var record = await _context.Produksis
            .FirstOrDefaultAsync(p => p.ProduksiTabId == req.TabId && p.Tanggal == targetUtc);

        if (record != null)
        {
            record.BS = 0;
            record.Keterangan = "";
        }

        // 2. Delete related Mutasi records for that product + date
        var relatedMutasi = await _context.BahanBakus
            .Where(b => b.ProductSlug == req.ProductSlug
                     && b.Tipe == "Mutasi"
                     && b.Tanggal == targetUtc
                     && b.Keterangan != null
                     && (b.Keterangan.StartsWith("Produksi ") || b.Keterangan.StartsWith("produksi ")))
            .ToListAsync();

        _context.BahanBakus.RemoveRange(relatedMutasi);

        await (_context as DbContext)!.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            deletedMutasiCount = relatedMutasi.Count
        });
    }


    // ═══════════════════════════════════════
    //  Get existing Mutasi for a produksi date
    // ═══════════════════════════════════════

    [HttpGet("mutasi")]
    public async Task<IActionResult> GetMutasiForProduksi(
        [FromQuery] string productSlug,
        [FromQuery] string tanggal)
    {
        if (string.IsNullOrWhiteSpace(productSlug))
            return BadRequest("productSlug is required.");

        if (!DateTime.TryParse(tanggal, out var localDate))
            return BadRequest("Invalid date format.");

        var utcOffset = TimeSpan.FromHours(7);
        var targetUtc = DateTime.SpecifyKind(localDate.Date.Add(-utcOffset), DateTimeKind.Utc);

        var mutasi = await _context.BahanBakus
            .Where(b => b.ProductSlug == productSlug
                     && b.Tipe == "Mutasi"
                     && b.Tanggal == targetUtc
                     && b.Keterangan != null
                     && (b.Keterangan.StartsWith("Produksi ") || b.Keterangan.StartsWith("produksi ")))
            .Select(b => new {
                b.NamaBahan,
                b.Kuantum,
                b.Satuan,
                b.Jenis
            })
            .ToListAsync();

        return Ok(mutasi);
    }


    public record CreateTabRequest(string ProductSlug, string Nama);
    public record RenameTabRequest(string Nama);

    public class CancelWithMaterialsRequest
    {
        public string ProductSlug { get; set; } = string.Empty;
        public int TabId { get; set; }
        public string Tanggal { get; set; } = string.Empty;
    }
    
    public class ProduksiRowDto
    {
        public int Id { get; set; }
        public string Tanggal { get; set; } = string.Empty;
        public double BS { get; set; }
        public double PS { get; set; }
        public double COA { get; set; }
        public double PG { get; set; }
        public double Kumulatif { get; set; }
        public double StokAkhir { get; set; }
        public string Keterangan { get; set; } = string.Empty;
    }

    public class SaveProduksiRequest
    {
        public string ProductSlug { get; set; } = string.Empty;
        public int TabId { get; set; }
        public string Tanggal { get; set; } = string.Empty;
        public double BS { get; set; }
        public double PS { get; set; }
        public double COA { get; set; }
        public double PG { get; set; }
        public string? Keterangan { get; set; }
    }

    public class SaveWithMaterialsRequest
    {
        public string ProductSlug { get; set; } = string.Empty;
        public string? ProductFullName { get; set; }
        public int TabId { get; set; }
        public string Tanggal { get; set; } = string.Empty;
        public double BS { get; set; }
        public string? Keterangan { get; set; }
        public List<MaterialUsageDto>? Materials { get; set; }
    }

    public class MaterialUsageDto
    {
        public string NamaBahan { get; set; } = string.Empty;
        public double Kuantum { get; set; }
        public string? Satuan { get; set; }
        public string Jenis { get; set; } = "Baku";
    }
}
