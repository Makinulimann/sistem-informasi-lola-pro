using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BahanBakuController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public BahanBakuController(ISipProDbContext context)
    {
        _context = context;
    }

    // ═══════════════════════════════════════
    //  Perusahaan
    // ═══════════════════════════════════════

    [HttpGet("perusahaan")]
    public async Task<IActionResult> GetPerusahaan()
    {
        var list = await _context.Perusahaans
            .Where(p => p.IsActive)
            .OrderBy(p => p.Nama)
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("perusahaan")]
    public async Task<IActionResult> CreatePerusahaan([FromBody] CreatePerusahaanDto dto)
    {
        var entity = new Perusahaan { Nama = dto.Nama };
        _context.Perusahaans.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    // ═══════════════════════════════════════
    //  Suplai & Mutasi (BahanBaku)
    // ═══════════════════════════════════════

    [HttpGet("suplai")]
    public async Task<IActionResult> GetSuplai(
        [FromQuery] string productSlug,
        [FromQuery] int? perusahaanId,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        // 1. Get configured material names
        var configuredNames = await _context.ProductMaterials
            .Include(pm => pm.MasterItem)
            .Where(pm => pm.ProductSlug == productSlug)
            .Select(pm => pm.MasterItem != null ? pm.MasterItem.Nama : "")
            .ToListAsync();

        var query = _context.BahanBakus
            .Where(b => b.Tipe == "Suplai" && configuredNames.Contains(b.NamaBahan));

        if (perusahaanId.HasValue)
            query = query.Where(b => b.PerusahaanId == perusahaanId.Value);
        if (bulan.HasValue)
            query = query.Where(b => b.Tanggal.Month == bulan.Value);
        if (tahun.HasValue)
            query = query.Where(b => b.Tanggal.Year == tahun.Value);

        var list = await query.OrderByDescending(b => b.Tanggal).ToListAsync();
        return Ok(list);
    }

    [HttpPost("suplai")]
    public async Task<IActionResult> CreateSuplai([FromBody] CreateBahanBakuDto dto)
    {
        var entity = new BahanBaku
        {
            Tipe = "Suplai",
            ProductSlug = dto.ProductSlug,
            PerusahaanId = dto.PerusahaanId == 0 ? null : dto.PerusahaanId,
            Tanggal = dto.Tanggal,
            Jenis = dto.Jenis,
            NamaBahan = dto.NamaBahan,
            Kuantum = dto.Kuantum,
            Satuan = dto.Satuan ?? "Kg",
            Dokumen = dto.Dokumen,
            Keterangan = dto.Keterangan
        };
        _context.BahanBakus.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSuplai(int id)
    {
        var entity = await _context.BahanBakus.FindAsync(id);
        if (entity == null) return NotFound();

        _context.BahanBakus.Remove(entity);
        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSuplai(int id, [FromBody] CreateBahanBakuDto dto)
    {
        var entity = await _context.BahanBakus.FindAsync(id);
        if (entity == null) return NotFound();

        // Update fields
        entity.ProductSlug = dto.ProductSlug;
        entity.PerusahaanId = dto.PerusahaanId == 0 ? null : dto.PerusahaanId;
        entity.Tanggal = dto.Tanggal;
        entity.Jenis = dto.Jenis;
        entity.NamaBahan = dto.NamaBahan;
        entity.Kuantum = dto.Kuantum;
        entity.Satuan = dto.Satuan ?? "Kg";
        entity.Dokumen = dto.Dokumen;
        entity.Keterangan = dto.Keterangan;

        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpGet("mutasi")]
    public async Task<IActionResult> GetMutasi(
        [FromQuery] string productSlug,
        [FromQuery] int? perusahaanId,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        // 1. Get configured material names
        var configuredNames = await _context.ProductMaterials
            .Include(pm => pm.MasterItem)
            .Where(pm => pm.ProductSlug == productSlug)
            .Select(pm => pm.MasterItem != null ? pm.MasterItem.Nama : "")
            .ToListAsync();

        var query = _context.BahanBakus
            .Where(b => b.Tipe == "Mutasi" && configuredNames.Contains(b.NamaBahan));

        if (perusahaanId.HasValue)
            query = query.Where(b => b.PerusahaanId == perusahaanId.Value);
        if (bulan.HasValue)
            query = query.Where(b => b.Tanggal.Month == bulan.Value);
        if (tahun.HasValue)
            query = query.Where(b => b.Tanggal.Year == tahun.Value);

        var list = await query.OrderByDescending(b => b.Tanggal).ToListAsync();
        return Ok(list);
    }

    [HttpPost("mutasi")]
    public async Task<IActionResult> CreateMutasi([FromBody] CreateBahanBakuDto dto)
    {
        var entity = new BahanBaku
        {
            Tipe = "Mutasi",
            ProductSlug = dto.ProductSlug,
            PerusahaanId = dto.PerusahaanId == 0 ? null : dto.PerusahaanId,
            Tanggal = dto.Tanggal,
            Jenis = dto.Jenis,
            NamaBahan = dto.NamaBahan,
            Kuantum = dto.Kuantum,
            Satuan = dto.Satuan ?? "Kg",
            Dokumen = dto.Dokumen,
            Keterangan = dto.Keterangan
        };
        _context.BahanBakus.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    // ═══════════════════════════════════════
    //  Materials (customizable columns)
    // ═══════════════════════════════════════

    [HttpGet("materials")]
    public async Task<IActionResult> GetMaterials([FromQuery] string productSlug)
    {
        var list = await _context.Materials
            .Where(m => m.ProductSlug == productSlug && m.IsActive)
            .OrderBy(m => m.Order)
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("materials")]
    public async Task<IActionResult> CreateMaterial([FromBody] CreateMaterialDto dto)
    {
        var maxOrder = await _context.Materials
            .Where(m => m.ProductSlug == dto.ProductSlug)
            .Select(m => (int?)m.Order)
            .MaxAsync() ?? 0;

        var entity = new Material
        {
            ProductSlug = dto.ProductSlug,
            Nama = dto.Nama,
            Order = maxOrder + 1
        };
        _context.Materials.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpPut("materials/{id}")]
    public async Task<IActionResult> UpdateMaterial(int id, [FromBody] UpdateMaterialDto dto)
    {
        var entity = await _context.Materials.FindAsync(id);
        if (entity == null) return NotFound();

        entity.Nama = dto.Nama;
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpDelete("materials/{id}")]
    public async Task<IActionResult> DeleteMaterial(int id)
    {
        var entity = await _context.Materials.FindAsync(id);
        if (entity == null) return NotFound();

        entity.IsActive = false;
        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    // ═══════════════════════════════════════
    //  Balance Stok
    // ═══════════════════════════════════════

    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance(
        [FromQuery] string productSlug,
        [FromQuery] int? perusahaanId,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        var query = _context.BalanceStoks
            .Include(b => b.Details)
            .Where(b => b.ProductSlug == productSlug);

        if (perusahaanId.HasValue)
            query = query.Where(b => b.PerusahaanId == perusahaanId.Value);
        if (bulan.HasValue)
            query = query.Where(b => b.Tanggal.Month == bulan.Value);
        if (tahun.HasValue)
            query = query.Where(b => b.Tanggal.Year == tahun.Value);

        var list = await query
            .OrderBy(b => b.Tanggal)
            .Select(b => new
            {
                b.Id,
                b.Tanggal,
                b.Produksi,
                Details = b.Details.Select(d => new
                {
                    d.MaterialId,
                    MaterialNama = d.Material != null ? d.Material.Nama : "",
                    d.Out,
                    d.In,
                    d.StokAkhir
                })
            })
            .ToListAsync();

        return Ok(list);
    }

    // ═══════════════════════════════════════
    //  Balance Stok (computed from Suplai/Mutasi per configured materials)
    // ═══════════════════════════════════════

    [HttpGet("balance-stok")]
    public async Task<IActionResult> GetBalanceStok(
        [FromQuery] string productSlug,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        // 1. Get all configured materials for this product
        var configuredMaterials = await _context.ProductMaterials
            .Include(pm => pm.MasterItem)
            .Where(pm => pm.ProductSlug == productSlug)
            .OrderBy(pm => pm.Jenis)
            .ThenBy(pm => pm.MasterItem != null ? pm.MasterItem.Nama : "")
            .ToListAsync();

        var configuredNames = configuredMaterials
            .Select(pm => pm.MasterItem != null ? pm.MasterItem.Nama : "")
            .Where(n => !string.IsNullOrEmpty(n))
            .ToList();

        // 2. Determine Period Range (in local time UTC+7, stored as UTC in DB)
        //    Dates in DB are stored as UTC but represent local time (UTC+7).
        //    e.g., "1 Feb 2026 00:00 WIB" is stored as "2026-01-31T17:00:00Z"
        //    We use UTC boundaries shifted by -7 hours for correct comparison.
        var utcOffset = TimeSpan.FromHours(7);
        bool hasPeriodFilter = bulan.HasValue || tahun.HasValue;
        
        DateTime periodStartUtc = DateTime.MinValue;
        DateTime periodEndUtc = DateTime.MaxValue;   // exclusive upper bound

        if (bulan.HasValue && tahun.HasValue)
        {
            // Local start of month → UTC
            var localStart = new DateTime(tahun.Value, bulan.Value, 1);
            var localEnd = localStart.AddMonths(1); // exclusive: start of next month
            periodStartUtc = localStart.Add(-utcOffset); // convert to UTC
            periodEndUtc = localEnd.Add(-utcOffset);     // convert to UTC
        }
        else if (tahun.HasValue)
        {
            var localStart = new DateTime(tahun.Value, 1, 1);
            var localEnd = new DateTime(tahun.Value + 1, 1, 1); // exclusive: start of next year
            periodStartUtc = localStart.Add(-utcOffset);
            periodEndUtc = localEnd.Add(-utcOffset);
        }

        // 3. Fetch ALL BahanBaku records for configured materials
        var allRecords = await _context.BahanBakus
            .Where(b => configuredNames.Contains(b.NamaBahan))
            .ToListAsync();

        // 4. Aggregate per material
        var result = configuredMaterials.Select(pm =>
        {
            var materialName = pm.MasterItem?.Nama ?? "";
            var satuan = pm.MasterItem?.SatuanDefault ?? "Kg";

            // All records for this material
            var materialRecords = allRecords
                .Where(r => r.NamaBahan.Equals(materialName, StringComparison.OrdinalIgnoreCase))
                .ToList();

            // In/Out for the SELECTED PERIOD only
            var periodRecords = hasPeriodFilter
                ? materialRecords.Where(r => r.Tanggal >= periodStartUtc && r.Tanggal < periodEndUtc).ToList()
                : materialRecords;

            var totalInPeriod = periodRecords
                .Where(r => r.Tipe == "Suplai")
                .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));

            var totalOutPeriod = periodRecords
                .Where(r => r.Tipe == "Mutasi")
                .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));

            // Cumulative Stock = ALL records up to the END of the selected period
            var cumulativeRecords = hasPeriodFilter
                ? materialRecords.Where(r => r.Tanggal < periodEndUtc).ToList()
                : materialRecords;

            var totalInCumulative = cumulativeRecords
                .Where(r => r.Tipe == "Suplai")
                .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));

            var totalOutCumulative = cumulativeRecords
                .Where(r => r.Tipe == "Mutasi")
                .Sum(r => ConvertUnit(r.Kuantum, r.Satuan, satuan));

            return new
            {
                Nama = materialName,
                Jenis = pm.Jenis,
                Satuan = satuan,
                TotalIn = totalInPeriod,
                TotalOut = totalOutPeriod,
                Stok = totalInCumulative - totalOutCumulative
            };
        }).ToList();

        return Ok(result);
    }

    private double ConvertUnit(double value, string fromUnit, string toUnit)
    {
        if (string.Equals(fromUnit, toUnit, StringComparison.OrdinalIgnoreCase)) return value;

        // Simplify units (lowercase + trim)
        var from = fromUnit?.Trim().ToLower() ?? "";
        var to = toUnit?.Trim().ToLower() ?? "";

        // Normalize aliases
        string Normalize(string u) => u switch
        {
            "l" => "liter",
            "lt" => "liter",
            "litre" => "liter",
            "milliliter" => "ml",
            "millilitre" => "ml",
            "cc" => "ml",
            "kilo" => "kg",
            "kilogram" => "kg",
            "gr" => "gram",
            "g" => "gram",
            _ => u
        };

        from = Normalize(from);
        to = Normalize(to);

        // Mass conversions (Base: Kg)
        double ToKg(double val, string u) => u switch
        {
            "ton" => val * 1000,
            "kwintal" => val * 100,
            "kg" => val,
            "gram" => val / 1000,
            "mg" => val / 1000000,
            _ => val 
        };

        double FromKg(double val, string u) => u switch
        {
            "ton" => val / 1000,
            "kwintal" => val / 100,
            "kg" => val,
            "gram" => val * 1000,
            "mg" => val * 1000000,
            _ => val
        };

        // Volume conversions (Base: Liter)
        double ToLiter(double val, string u) => u switch
        {
            "kl" => val * 1000,
            "liter" => val,
            "ml" => val / 1000,
            _ => val
        };

        double FromLiter(double val, string u) => u switch
        {
            "kl" => val / 1000,
            "liter" => val,
            "ml" => val * 1000,
            _ => val
        };

        // Check family
        var massUnits = new[] { "ton", "kwintal", "kg", "gram", "mg" };
        var volUnits = new[] { "kl", "liter", "ml" };

        if (massUnits.Contains(from) && massUnits.Contains(to))
        {
            var kg = ToKg(value, from);
            return FromKg(kg, to);
        }

        if (volUnits.Contains(from) && volUnits.Contains(to))
        {
            var liter = ToLiter(value, from);
            return FromLiter(liter, to);
        }

        // Cross-family or unknown: return original
        return value;
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] string productSlug,
        [FromQuery] string namaBahan,
        [FromQuery] string tipe,
        [FromQuery] int? bulan,
        [FromQuery] int? tahun)
    {
        var query = _context.BahanBakus
            .Where(b => b.Tipe == tipe
                     && b.NamaBahan == namaBahan);

        // UTC+7 offset for correct local date filtering
        var utcOffset = TimeSpan.FromHours(7);

        if (bulan.HasValue && tahun.HasValue)
        {
            var localStart = new DateTime(tahun.Value, bulan.Value, 1);
            var localEnd = localStart.AddMonths(1);
            var startUtc = localStart.Add(-utcOffset);
            var endUtc = localEnd.Add(-utcOffset);
            query = query.Where(b => b.Tanggal >= startUtc && b.Tanggal < endUtc);
        }
        else if (tahun.HasValue)
        {
            var localStart = new DateTime(tahun.Value, 1, 1);
            var localEnd = new DateTime(tahun.Value + 1, 1, 1);
            var startUtc = localStart.Add(-utcOffset);
            var endUtc = localEnd.Add(-utcOffset);
            query = query.Where(b => b.Tanggal >= startUtc && b.Tanggal < endUtc);
        }

        var list = await query.OrderByDescending(b => b.Tanggal).ToListAsync();
        return Ok(list);
    }
}

// ═══════════════════════════════════════
//  DTOs
// ═══════════════════════════════════════

public record CreatePerusahaanDto(string Nama);

public record CreateBahanBakuDto(
    string ProductSlug,
    int? PerusahaanId,
    DateTime Tanggal,
    string Jenis,
    string NamaBahan,
    double Kuantum,
    string? Satuan,
    string Dokumen,
    string Keterangan
);

public record CreateMaterialDto(string ProductSlug, string Nama);
public record UpdateMaterialDto(string Nama);
