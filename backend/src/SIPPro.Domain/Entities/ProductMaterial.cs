using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SIPPro.Domain.Entities;

public class ProductMaterial
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProductSlug { get; set; } = string.Empty;

    public int MasterItemId { get; set; }

    [ForeignKey("MasterItemId")]
    public virtual MasterItem? MasterItem { get; set; }

    [Required]
    [MaxLength(20)]
    public string Jenis { get; set; } = "Baku"; // 'Baku' or 'Penolong'
}
