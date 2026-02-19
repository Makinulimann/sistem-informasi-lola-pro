using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class ProduksiTab
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProductSlug { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Nama { get; set; } = string.Empty;

    public int Order { get; set; }

    public virtual ICollection<Produksi> Produksis { get; set; } = new List<Produksi>();
}
