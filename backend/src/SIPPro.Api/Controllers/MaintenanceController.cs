using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public MaintenanceController(ISipProDbContext context)
    {
        _context = context;
    }

    // ═══════════════════════════════════════
    //  Maintenance CRUD
    // ═══════════════════════════════════════

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? bulan,
        [FromQuery] int? tahun,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? sortBy = "Tanggal",
        [FromQuery] bool sortDesc = true)
    {
        var query = _context.Maintenances.AsQueryable();

        if (bulan.HasValue)
            query = query.Where(m => m.Tanggal.Month == bulan.Value);
        if (tahun.HasValue)
            query = query.Where(m => m.Tanggal.Year == tahun.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(m =>
                m.Equipment.ToLower().Contains(s) ||
                m.Area.ToLower().Contains(s) ||
                m.Kegiatan.ToLower().Contains(s) ||
                (m.Keterangan != null && m.Keterangan.ToLower().Contains(s)));
        }

        var total = await query.CountAsync();

        if (!string.IsNullOrEmpty(sortBy))
        {
            var propName = sortBy.ToLower();
            if (sortDesc)
            {
                query = propName switch
                {
                    "equipment" => query.OrderByDescending(m => m.Equipment),
                    "area" => query.OrderByDescending(m => m.Area),
                    "kegiatan" => query.OrderByDescending(m => m.Kegiatan),
                    "keterangan" => query.OrderByDescending(m => m.Keterangan),
                    "dokumentasi" => query.OrderByDescending(m => m.Dokumentasi),
                    _ => query.OrderByDescending(m => m.Tanggal).ThenByDescending(m => m.CreatedAt)
                };
            }
            else
            {
                query = propName switch
                {
                    "equipment" => query.OrderBy(m => m.Equipment),
                    "area" => query.OrderBy(m => m.Area),
                    "kegiatan" => query.OrderBy(m => m.Kegiatan),
                    "keterangan" => query.OrderBy(m => m.Keterangan),
                    "dokumentasi" => query.OrderBy(m => m.Dokumentasi),
                    _ => query.OrderBy(m => m.Tanggal).ThenBy(m => m.CreatedAt)
                };
            }
        }
        else
        {
            query = query.OrderByDescending(m => m.Tanggal).ThenByDescending(m => m.CreatedAt);
        }

        var list = await query.Skip((page - 1) * limit)
                              .Take(limit)
                              .ToListAsync();

        return Ok(new { Data = list, Total = total });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await _context.Maintenances.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateMaintenanceDto dto)
    {
        var entity = new Maintenance
        {
            Tanggal = dto.Tanggal,
            Equipment = dto.Equipment,
            Area = dto.Area,
            Kegiatan = dto.Kegiatan,
            Keterangan = dto.Keterangan,
            Dokumentasi = dto.Dokumentasi,
            CreatedAt = DateTime.UtcNow
        };
        _context.Maintenances.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateMaintenanceDto dto)
    {
        var entity = await _context.Maintenances.FindAsync(id);
        if (entity == null) return NotFound();

        entity.Tanggal = dto.Tanggal;
        entity.Equipment = dto.Equipment;
        entity.Area = dto.Area;
        entity.Kegiatan = dto.Kegiatan;
        entity.Keterangan = dto.Keterangan;
        entity.Dokumentasi = dto.Dokumentasi;

        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _context.Maintenances.FindAsync(id);
        if (entity == null) return NotFound();

        _context.Maintenances.Remove(entity);
        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    /// <summary>
    /// Returns maintenance summary for dashboard charts.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? bulan,
        [FromQuery] int? tahun,
        [FromQuery] string? area,
        [FromQuery] string? equipment)
    {
        var now = DateTime.UtcNow.AddHours(7);
        var targetBulan = bulan ?? now.Month;
        var targetTahun = tahun ?? now.Year;

        var utcOffset = TimeSpan.FromHours(7);
        var localStart = new DateTime(targetTahun, targetBulan, 1);
        var localEnd = localStart.AddMonths(1);
        var startUtc = DateTime.SpecifyKind(localStart.Add(-utcOffset), DateTimeKind.Utc);
        var endUtc = DateTime.SpecifyKind(localEnd.Add(-utcOffset), DateTimeKind.Utc);

        var query = _context.Maintenances.AsQueryable()
            .Where(m => m.Tanggal >= startUtc && m.Tanggal < endUtc);

        // Get all distinct values for filters (before applying area/equipment filter)
        var allAreas = await query.Select(m => m.Area).Distinct().OrderBy(a => a).ToListAsync();
        var allEquipments = await query.Select(m => m.Equipment).Distinct().OrderBy(e => e).ToListAsync();

        if (!string.IsNullOrWhiteSpace(area))
            query = query.Where(m => m.Area == area);
        if (!string.IsNullOrWhiteSpace(equipment))
            query = query.Where(m => m.Equipment == equipment);

        var records = await query.ToListAsync();

        // Group by Area
        var byArea = records
            .GroupBy(m => m.Area)
            .Select(g => new { area = g.Key, count = g.Count() })
            .OrderByDescending(g => g.count)
            .ToList();

        // Group by Equipment
        var byEquipment = records
            .GroupBy(m => m.Equipment)
            .Select(g => new { equipment = g.Key, count = g.Count() })
            .OrderByDescending(g => g.count)
            .ToList();

        // Timeline: group by day
        var byDay = records
            .GroupBy(m => m.Tanggal.Add(utcOffset).Date)
            .Select(g => new { date = g.Key.ToString("dd"), count = g.Count() })
            .OrderBy(g => g.date)
            .ToList();

        return Ok(new
        {
            bulan = targetBulan,
            tahun = targetTahun,
            totalKegiatan = records.Count,
            areas = allAreas,
            equipments = allEquipments,
            byArea,
            byEquipment,
            byDay
        });
    }
}

// ═══════════════════════════════════════
//  DTO
// ═══════════════════════════════════════

public record CreateMaintenanceDto(
    DateTime Tanggal,
    string Equipment,
    string Area,
    string Kegiatan,
    string? Keterangan,
    string? Dokumentasi
);
