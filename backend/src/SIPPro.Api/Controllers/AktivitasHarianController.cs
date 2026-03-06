using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AktivitasHarianController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public AktivitasHarianController(ISipProDbContext context)
    {
        _context = context;
    }

    // ═══════════════════════════════════════
    //  Aktivitas Harian (Logbook)
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
        var query = _context.AktivitasHarians.AsQueryable();

        if (bulan.HasValue)
            query = query.Where(a => a.Tanggal.Month == bulan.Value);
        if (tahun.HasValue)
            query = query.Where(a => a.Tanggal.Year == tahun.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(a =>
                a.Pic.ToLower().Contains(s) ||
                a.Lokasi.ToLower().Contains(s) ||
                a.Deskripsi.ToLower().Contains(s));
        }

        var total = await query.CountAsync();

        if (!string.IsNullOrEmpty(sortBy))
        {
            var propName = sortBy.ToLower();
            if (sortDesc)
            {
                query = propName switch
                {
                    "pic" => query.OrderByDescending(a => a.Pic),
                    "lokasi" => query.OrderByDescending(a => a.Lokasi),
                    "deskripsi" => query.OrderByDescending(a => a.Deskripsi),
                    "dokumentasi" => query.OrderByDescending(a => a.Dokumentasi),
                    _ => query.OrderByDescending(a => a.Tanggal).ThenByDescending(a => a.CreatedAt)
                };
            }
            else
            {
                query = propName switch
                {
                    "pic" => query.OrderBy(a => a.Pic),
                    "lokasi" => query.OrderBy(a => a.Lokasi),
                    "deskripsi" => query.OrderBy(a => a.Deskripsi),
                    "dokumentasi" => query.OrderBy(a => a.Dokumentasi),
                    _ => query.OrderBy(a => a.Tanggal).ThenBy(a => a.CreatedAt)
                };
            }
        }
        else
        {
            query = query.OrderByDescending(a => a.Tanggal).ThenByDescending(a => a.CreatedAt);
        }

        var list = await query.Skip((page - 1) * limit)
                              .Take(limit)
                              .ToListAsync();

        return Ok(new { Data = list, Total = total });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entity = await _context.AktivitasHarians.FindAsync(id);
        if (entity == null) return NotFound();
        return Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAktivitasHarianDto dto)
    {
        var entity = new AktivitasHarian
        {
            Tanggal = dto.Tanggal,
            Pic = dto.Pic,
            Lokasi = dto.Lokasi,
            Deskripsi = dto.Deskripsi,
            Dokumentasi = dto.Dokumentasi,
            CreatedAt = DateTime.UtcNow
        };
        _context.AktivitasHarians.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateAktivitasHarianDto dto)
    {
        var entity = await _context.AktivitasHarians.FindAsync(id);
        if (entity == null) return NotFound();

        entity.Tanggal = dto.Tanggal;
        entity.Pic = dto.Pic;
        entity.Lokasi = dto.Lokasi;
        entity.Deskripsi = dto.Deskripsi;
        entity.Dokumentasi = dto.Dokumentasi;

        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _context.AktivitasHarians.FindAsync(id);
        if (entity == null) return NotFound();

        _context.AktivitasHarians.Remove(entity);
        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    // ═══════════════════════════════════════
    //  PIC Templates
    // ═══════════════════════════════════════

    [HttpGet("pic")]
    public async Task<IActionResult> GetPics()
    {
        var list = await _context.LogbookPics
            .Where(p => p.IsActive)
            .OrderBy(p => p.Nama)
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("pic")]
    public async Task<IActionResult> CreatePic([FromBody] CreateTemplateDto dto)
    {
        var entity = new LogbookPic { Nama = dto.Nama };
        _context.LogbookPics.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpPut("pic/{id}")]
    public async Task<IActionResult> UpdatePic(int id, [FromBody] CreateTemplateDto dto)
    {
        var entity = await _context.LogbookPics.FindAsync(id);
        if (entity == null) return NotFound();

        var oldName = entity.Nama;
        var newName = dto.Nama;

        // Cascade: update all AktivitasHarian records that contain this PIC name
        if (oldName != newName)
        {
            var records = await _context.AktivitasHarians
                .Where(a => a.Pic.Contains(oldName))
                .ToListAsync();

            foreach (var record in records)
            {
                // Handle comma-separated PIC values
                var picList = record.Pic.Split(", ").ToList();
                for (int i = 0; i < picList.Count; i++)
                {
                    if (picList[i] == oldName)
                        picList[i] = newName;
                }
                record.Pic = string.Join(", ", picList);
            }
        }

        entity.Nama = newName;
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpDelete("pic/{id}")]
    public async Task<IActionResult> DeletePic(int id)
    {
        var entity = await _context.LogbookPics.FindAsync(id);
        if (entity == null) return NotFound();

        // Check if any AktivitasHarian records use this PIC
        var usedCount = await _context.AktivitasHarians
            .CountAsync(a => a.Pic.Contains(entity.Nama));

        if (usedCount > 0)
        {
            return Conflict(new { message = $"PIC '{entity.Nama}' tidak dapat dihapus karena digunakan di {usedCount} data aktivitas." });
        }

        entity.IsActive = false;
        await _context.SaveChangesAsync(default);
        return NoContent();
    }

    // ═══════════════════════════════════════
    //  Lokasi Templates
    // ═══════════════════════════════════════

    [HttpGet("lokasi")]
    public async Task<IActionResult> GetLokasis()
    {
        var list = await _context.LogbookLokasis
            .Where(l => l.IsActive)
            .OrderBy(l => l.Nama)
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("lokasi")]
    public async Task<IActionResult> CreateLokasi([FromBody] CreateTemplateDto dto)
    {
        var entity = new LogbookLokasi { Nama = dto.Nama };
        _context.LogbookLokasis.Add(entity);
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpPut("lokasi/{id}")]
    public async Task<IActionResult> UpdateLokasi(int id, [FromBody] CreateTemplateDto dto)
    {
        var entity = await _context.LogbookLokasis.FindAsync(id);
        if (entity == null) return NotFound();

        var oldName = entity.Nama;
        var newName = dto.Nama;

        // Cascade: update all AktivitasHarian records that reference this Lokasi
        if (oldName != newName)
        {
            var records = await _context.AktivitasHarians
                .Where(a => a.Lokasi == oldName)
                .ToListAsync();

            foreach (var record in records)
            {
                record.Lokasi = newName;
            }
        }

        entity.Nama = newName;
        await _context.SaveChangesAsync(default);
        return Ok(entity);
    }

    [HttpDelete("lokasi/{id}")]
    public async Task<IActionResult> DeleteLokasi(int id)
    {
        var entity = await _context.LogbookLokasis.FindAsync(id);
        if (entity == null) return NotFound();

        // Check if any AktivitasHarian records use this Lokasi
        var usedCount = await _context.AktivitasHarians
            .CountAsync(a => a.Lokasi == entity.Nama);

        if (usedCount > 0)
        {
            return Conflict(new { message = $"Lokasi '{entity.Nama}' tidak dapat dihapus karena digunakan di {usedCount} data aktivitas." });
        }

        entity.IsActive = false;
        await _context.SaveChangesAsync(default);
        return NoContent();
    }
}

// ═══════════════════════════════════════
//  DTOs
// ═══════════════════════════════════════

public record CreateAktivitasHarianDto(
    DateTime Tanggal,
    string Pic,
    string Lokasi,
    string Deskripsi,
    string? Dokumentasi
);

public record CreateTemplateDto(string Nama);
