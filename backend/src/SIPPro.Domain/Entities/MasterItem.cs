using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class MasterItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nama { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Kode { get; set; }

    [MaxLength(50)]
    public string? SatuanDefault { get; set; } // e.g., "Kg", "L", "Pcs"

    [MaxLength(200)]
    public string? ScopeProductSlug { get; set; } // If null, it's Global. If set, only visible to this product.

    public bool IsActive { get; set; } = true;
}
