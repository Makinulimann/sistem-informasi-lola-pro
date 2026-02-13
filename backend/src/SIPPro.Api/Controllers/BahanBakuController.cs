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
        var query = _context.BahanBakus
            .Where(b => b.Tipe == "Suplai" && b.ProductSlug == productSlug);

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
            Dokumen = dto.Dokumen,
            Keterangan = dto.Keterangan
        };
        _context.BahanBakus.Add(entity);
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
        var query = _context.BahanBakus
            .Where(b => b.Tipe == "Mutasi" && b.ProductSlug == productSlug);

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
    string Dokumen,
    string Keterangan
);

public record CreateMaterialDto(string ProductSlug, string Nama);
public record UpdateMaterialDto(string Nama);
