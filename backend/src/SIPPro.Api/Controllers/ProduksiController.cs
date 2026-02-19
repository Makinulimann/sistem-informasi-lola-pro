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

        // Also delete associated production data
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

        var query = _context.Produksis
            .Where(p => p.ProductSlug == productSlug);

        if (tabId.HasValue)
            query = query.Where(p => p.ProduksiTabId == tabId.Value);

        // UTC+7 offset for correct local date filtering
        var utcOffset = TimeSpan.FromHours(7);

        if (bulan.HasValue && tahun.HasValue)
        {
            var localStart = new DateTime(tahun.Value, bulan.Value, 1);
            var localEnd = localStart.AddMonths(1);
            var startUtc = DateTime.SpecifyKind(localStart.Add(-utcOffset), DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(localEnd.Add(-utcOffset), DateTimeKind.Utc);
            query = query.Where(p => p.Tanggal >= startUtc && p.Tanggal < endUtc);
        }
        else if (tahun.HasValue)
        {
            var localStart = new DateTime(tahun.Value, 1, 1);
            var localEnd = new DateTime(tahun.Value + 1, 1, 1);
            var startUtc = DateTime.SpecifyKind(localStart.Add(-utcOffset), DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(localEnd.Add(-utcOffset), DateTimeKind.Utc);
            query = query.Where(p => p.Tanggal >= startUtc && p.Tanggal < endUtc);
        }

        var list = await query.OrderBy(p => p.Tanggal).ToListAsync();

        // Compute summary
        var totalProduksi = list.Sum(r => r.JumlahProduksi);
        var totalKeluar = list.Sum(r => r.Keluar);
        var lastKumulatif = list.Count > 0 ? list[^1].Kumulatif : 0;
        var lastStokAkhir = list.Count > 0 ? list[^1].StokAkhir : 0;

        return Ok(new
        {
            summary = new
            {
                totalProduksi,
                totalKeluar,
                kumulatif = lastKumulatif,
                stokAkhir = lastStokAkhir
            },
            data = list.Select(r => new
            {
                r.Id,
                tanggal = r.Tanggal,
                produksi = r.JumlahProduksi,
                r.Keluar,
                r.Kumulatif,
                r.StokAkhir,
                coa = r.COA,
                r.Keterangan
            })
        });
    }

    // ═══════════════════════════════════════
    //  DTOs
    // ═══════════════════════════════════════

    public record CreateTabRequest(string ProductSlug, string Nama);
    public record RenameTabRequest(string Nama);
}
