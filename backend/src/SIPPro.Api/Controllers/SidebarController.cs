using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SIPPro.Application.Interfaces;
using SIPPro.Domain.Entities;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SidebarController : ControllerBase
{
    private readonly ISipProDbContext _context;

    public SidebarController(ISipProDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns active sidebar menus as nested hierarchy (for rendering sidebar).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSidebar()
    {
        var menus = await _context.SidebarMenus
            .Where(m => m.IsActive)
            .OrderBy(m => m.Order)
            .ToListAsync();

        var hierarchy = BuildHierarchy(menus, null);
        return Ok(hierarchy);
    }

    /// <summary>
    /// Returns ALL sidebar menus (flat list for admin management).
    /// </summary>
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllSidebar()
    {
        var menus = await _context.SidebarMenus
            .OrderBy(m => m.ParentId)
            .ThenBy(m => m.Order)
            .ToListAsync();

        return Ok(menus);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] SidebarMenu menu)
    {
        _context.SidebarMenus.Add(menu);
        await _context.SaveChangesAsync(CancellationToken.None);
        return CreatedAtAction(nameof(GetSidebar), new { id = menu.Id }, menu);
    }

    /// <summary>
    /// Creates a parent menu and its default children in a single request.
    /// Used for creating Level 2 menus with default Level 3 sub-pages.
    /// </summary>
    [HttpPost("create-with-children")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateWithChildren([FromBody] CreateWithChildrenRequest request)
    {
        // Create the parent menu first
        var parent = new SidebarMenu
        {
            Label = request.Label,
            Icon = request.Icon ?? "",
            Href = request.Href ?? "#",
            ParentId = request.ParentId,
            Order = request.Order,
            IsActive = true,
            RoleAccess = request.RoleAccess ?? "All"
        };
        _context.SidebarMenus.Add(parent);
        await _context.SaveChangesAsync(CancellationToken.None);

        // Create children
        if (request.Children != null && request.Children.Any())
        {
            var order = 1;
            foreach (var child in request.Children)
            {
                _context.SidebarMenus.Add(new SidebarMenu
                {
                    Label = child.Label,
                    Icon = child.Icon ?? "",
                    Href = child.Href ?? "#",
                    ParentId = parent.Id,
                    Order = order++,
                    IsActive = true,
                    RoleAccess = parent.RoleAccess
                });
            }
            await _context.SaveChangesAsync(CancellationToken.None);
        }

        return Ok(parent);
    }

    public class CreateWithChildrenRequest
    {
        public string Label { get; set; } = "";
        public string? Icon { get; set; }
        public string? Href { get; set; }
        public int? ParentId { get; set; }
        public int Order { get; set; }
        public string? RoleAccess { get; set; }
        public List<ChildMenuRequest>? Children { get; set; }
    }

    public class ChildMenuRequest
    {
        public string Label { get; set; } = "";
        public string? Icon { get; set; }
        public string? Href { get; set; }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] SidebarMenu menu)
    {
        if (id != menu.Id) return BadRequest();

        var existing = await _context.SidebarMenus.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Label = menu.Label;
        existing.Icon = menu.Icon;
        existing.Href = menu.Href;
        existing.ParentId = menu.ParentId;
        existing.Order = menu.Order;
        existing.IsActive = menu.IsActive;
        existing.RoleAccess = menu.RoleAccess;

        await _context.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var menu = await _context.SidebarMenus.FindAsync(id);
        if (menu == null) return NotFound();

        // Delete children first
        var children = await _context.SidebarMenus.Where(m => m.ParentId == id).ToListAsync();
        foreach (var child in children)
        {
            var grandChildren = await _context.SidebarMenus.Where(m => m.ParentId == child.Id).ToListAsync();
            _context.SidebarMenus.RemoveRange(grandChildren);
            _context.SidebarMenus.Remove(child);
        }

        _context.SidebarMenus.Remove(menu);
        await _context.SaveChangesAsync(CancellationToken.None);
        return NoContent();
    }

    /// <summary>
    /// Seeds the database with initial sidebar data matching navigation.ts.
    /// Clears existing data first ("Reset"), then re-seeds.
    /// </summary>
    [HttpPost("seed")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Seed()
    {
        // Clear existing data for a clean re-seed
        var existing = await _context.SidebarMenus.ToListAsync();
        if (existing.Any())
        {
            _context.SidebarMenus.RemoveRange(existing);
            await _context.SaveChangesAsync(CancellationToken.None);
        }

        // ── Level 1: Top-level sections ──
        var dashboard = new SidebarMenu { Label = "Dashboard", Icon = "dashboard", Href = "/dashboard", Order = 1, RoleAccess = "All" };
        var portalAdmin = new SidebarMenu { Label = "Portal Admin", Icon = "users", Href = "#", Order = 2, RoleAccess = "Admin" };
        var petroganik = new SidebarMenu { Label = "Produk Petroganik", Icon = "package", Href = "#", Order = 3, RoleAccess = "Admin,VP" };
        var nonPetroganik = new SidebarMenu { Label = "Produk Non Petroganik", Icon = "package", Href = "#", Order = 4, RoleAccess = "Admin,VP" };
        var pengembangan = new SidebarMenu { Label = "Produk Pengembangan", Icon = "flask", Href = "#", Order = 5, RoleAccess = "Admin,VP,KPP" };

        _context.SidebarMenus.AddRange(dashboard, portalAdmin, petroganik, nonPetroganik, pengembangan);
        await _context.SaveChangesAsync(CancellationToken.None);

        // ── Level 2: Children of Portal Admin ──
        var mUser = new SidebarMenu { Label = "Manajemen User", Href = "/dashboard/admin/users", ParentId = portalAdmin.Id, Order = 1, RoleAccess = "Admin" };
        var mSidebar = new SidebarMenu { Label = "Manajemen Sidebar", Href = "/dashboard/admin/sidebar", ParentId = portalAdmin.Id, Order = 2, RoleAccess = "Admin" };
        _context.SidebarMenus.AddRange(mUser, mSidebar);

        // ── Level 2: Children of Produk Petroganik ──
        var nitrea = new SidebarMenu { Label = "Nitrea 5Kg", Href = "#", ParentId = petroganik.Id, Order = 1, RoleAccess = "Admin,VP" };
        var phosgreen = new SidebarMenu { Label = "Phosgreen", Href = "#", ParentId = petroganik.Id, Order = 2, RoleAccess = "Admin,VP" };
        var phonska = new SidebarMenu { Label = "Phonska", Href = "#", ParentId = petroganik.Id, Order = 3, RoleAccess = "Admin,VP" };
        _context.SidebarMenus.AddRange(nitrea, phosgreen, phonska);

        // ── Level 2: Children of Non Petroganik ──
        var petrocas = new SidebarMenu { Label = "Petrocas", Href = "#", ParentId = nonPetroganik.Id, Order = 1, RoleAccess = "Admin,VP" };
        var kaptan = new SidebarMenu { Label = "Kaptan", Href = "#", ParentId = nonPetroganik.Id, Order = 2, RoleAccess = "Admin,VP" };
        var fillerPlus = new SidebarMenu { Label = "Filler Plus", Href = "#", ParentId = nonPetroganik.Id, Order = 3, RoleAccess = "Admin,VP" };
        _context.SidebarMenus.AddRange(petrocas, kaptan, fillerPlus);

        // ── Level 2: Children of Pengembangan ──
        var gladiator = new SidebarMenu { Label = "PetroGladiator", Href = "#", ParentId = pengembangan.Id, Order = 1, RoleAccess = "Admin,VP,KPP" };
        var bioFertil = new SidebarMenu { Label = "BioFertil", Href = "#", ParentId = pengembangan.Id, Order = 2, RoleAccess = "Admin,VP,KPP" };
        var petroFish = new SidebarMenu { Label = "PetroFish", Href = "#", ParentId = pengembangan.Id, Order = 3, RoleAccess = "Admin,VP,KPP" };
        var phonskaOca = new SidebarMenu { Label = "Phonska Oca", Href = "#", ParentId = pengembangan.Id, Order = 4, RoleAccess = "Admin,VP,KPP" };
        _context.SidebarMenus.AddRange(gladiator, bioFertil, petroFish, phonskaOca);

        await _context.SaveChangesAsync(CancellationToken.None);

        // ── Level 3: Sub-items (Bahan Baku, Produksi, Analisa, RKAP) for each product ──
        var level2Products = new[] { nitrea, phosgreen, phonska, petrocas, kaptan, fillerPlus, gladiator, bioFertil, petroFish, phonskaOca };
        var productBasePaths = new Dictionary<int, string>
        {
            { nitrea.Id, "/dashboard/produk-petroganik/nitrea5kg" },
            { phosgreen.Id, "/dashboard/produk-petroganik/phosgreen" },
            { phonska.Id, "/dashboard/produk-petroganik/phonska" },
            { petrocas.Id, "/dashboard/produk-non-petroganik/petrocas" },
            { kaptan.Id, "/dashboard/produk-non-petroganik/kaptan" },
            { fillerPlus.Id, "/dashboard/produk-non-petroganik/filler-plus" },
            { gladiator.Id, "/dashboard/produk-pengembangan/petro-gladiator" },
            { bioFertil.Id, "/dashboard/produk-pengembangan/bio-fertil" },
            { petroFish.Id, "/dashboard/produk-pengembangan/petro-fish" },
            { phonskaOca.Id, "/dashboard/produk-pengembangan/phonska-oca" },
        };

        foreach (var product in level2Products)
        {
            var basePath = productBasePaths[product.Id];
            var subItems = new List<SidebarMenu>
            {
                new SidebarMenu { Label = "Bahan Baku", Href = $"{basePath}/bahan-baku", ParentId = product.Id, Order = 1, RoleAccess = product.RoleAccess },
                new SidebarMenu { Label = "Produksi", Href = $"{basePath}/produksi", ParentId = product.Id, Order = 2, RoleAccess = product.RoleAccess },
                new SidebarMenu { Label = "Analisa", Href = $"{basePath}/analisa", ParentId = product.Id, Order = 3, RoleAccess = product.RoleAccess },
                new SidebarMenu { Label = "RKAP", Href = $"{basePath}/rkap", ParentId = product.Id, Order = 4, RoleAccess = product.RoleAccess },
            };
            _context.SidebarMenus.AddRange(subItems);
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok("Seeding selesai. Seluruh data navigasi telah dimigrasikan.");
    }

    /// <summary>
    /// Builds nested hierarchy from flat list using ParentId.
    /// </summary>
    private List<object> BuildHierarchy(List<SidebarMenu> allMenus, int? parentId)
    {
        return allMenus
            .Where(m => m.ParentId == parentId)
            .OrderBy(m => m.Order)
            .Select(m => new
            {
                m.Id,
                m.Label,
                m.Icon,
                m.Href,
                m.IsActive,
                m.RoleAccess,
                m.ParentId,
                m.Order,
                Children = BuildHierarchy(allMenus, m.Id)
            })
            .ToList<object>();
    }
}
