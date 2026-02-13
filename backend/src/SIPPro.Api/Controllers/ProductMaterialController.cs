using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductMaterialController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public ProductMaterialController(ISipProDbContext context)
    {
        _context = context;
    }

    [HttpGet("master-items")]
    public async Task<IActionResult> GetMasterItems([FromQuery] string? search, [FromQuery] string? scopeProductSlug)
    {
        var query = _context.MasterItems.AsQueryable();

        // Scope filter: Global OR Local for this product
        if (!string.IsNullOrEmpty(scopeProductSlug))
        {
             query = query.Where(m => m.ScopeProductSlug == null || m.ScopeProductSlug == scopeProductSlug);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(m => m.Nama.Contains(search));
        }

        var items = await query
            .Where(m => m.IsActive)
            .OrderBy(m => m.ScopeProductSlug != null) // Locals last (or first?) - lets sort by Name primarily
            .ThenBy(m => m.Nama)
            .Take(50)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("master-items")]
    public async Task<IActionResult> CreateMasterItem([FromBody] CreateMasterItemDto dto)
    {
        // Check duplicates within the same scope
        // If creating Global: check global.
        // If creating Local: check local AND global? (to avoid confusion)
        // If a global item exists with name "X", should we allow local "X"? Ideally no.
        if (await _context.MasterItems.AnyAsync(m => m.Nama == dto.Nama && (m.ScopeProductSlug == null || m.ScopeProductSlug == dto.ScopeProductSlug)))
        {
            return BadRequest("Item with this name already exists available for this product.");
        }

        var item = new MasterItem
        {
            Nama = dto.Nama,
            Kode = dto.Kode,
            SatuanDefault = dto.SatuanDefault,
            ScopeProductSlug = dto.ScopeProductSlug,
            IsActive = true
        };

        _context.MasterItems.Add(item);
        await _context.SaveChangesAsync(new CancellationToken());

        return CreatedAtAction(nameof(GetMasterItems), new { id = item.Id }, item);
    }

    [HttpGet("{productSlug}")]
    public async Task<IActionResult> GetProductMaterials(string productSlug, [FromQuery] string? jenis)
    {
        var query = _context.ProductMaterials
            .Include(pm => pm.MasterItem)
            .Where(pm => pm.ProductSlug == productSlug);

        if (!string.IsNullOrEmpty(jenis))
        {
            query = query.Where(pm => pm.Jenis == jenis);
        }

        var materials = await query
            .OrderBy(pm => pm.MasterItem!.Nama)
            .Select(pm => new
            {
                pm.Id,
                pm.MasterItemId,
                Nama = pm.MasterItem!.Nama,
                pm.Jenis,
                Satuan = pm.MasterItem.SatuanDefault
            })
            .ToListAsync();

        return Ok(materials);
    }

    [HttpPost]
    public async Task<IActionResult> AssignMaterial([FromBody] AssignMaterialDto dto)
    {
        // Check if already assigned
        var exists = await _context.ProductMaterials
            .AnyAsync(pm => pm.ProductSlug == dto.ProductSlug && pm.MasterItemId == dto.MasterItemId && pm.Jenis == dto.Jenis);

        if (exists)
        {
            return BadRequest("Material already assigned to this product as " + dto.Jenis);
        }

        var pm = new ProductMaterial
        {
            ProductSlug = dto.ProductSlug,
            MasterItemId = dto.MasterItemId,
            Jenis = dto.Jenis
        };

        _context.ProductMaterials.Add(pm);
        await _context.SaveChangesAsync(new CancellationToken());

        return Ok(pm);
    }

    [HttpDelete("master-items/{id}")]
    public async Task<IActionResult> DeleteMasterItem(int id)
    {
        var item = await _context.MasterItems.FindAsync(id);
        if (item == null) return NotFound();

        _context.MasterItems.Remove(item);
        await _context.SaveChangesAsync(new CancellationToken());

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> UnassignMaterial(int id)
    {
        var pm = await _context.ProductMaterials.FindAsync(id);
        if (pm == null) return NotFound();

        _context.ProductMaterials.Remove(pm);
        await _context.SaveChangesAsync(new CancellationToken());

        return NoContent();
    }

    [HttpDelete("reset")]
    public async Task<IActionResult> ResetMaterials()
    {
        // Delete all ProductMaterials properly
        await _context.ProductMaterials.ExecuteDeleteAsync();
        
        // Delete all MasterItems properly
        await _context.MasterItems.ExecuteDeleteAsync();

        return NoContent();
    }
}

public record CreateMasterItemDto(string Nama, string? Kode, string? SatuanDefault, string? ScopeProductSlug);
public record AssignMaterialDto(string ProductSlug, int MasterItemId, string Jenis);
