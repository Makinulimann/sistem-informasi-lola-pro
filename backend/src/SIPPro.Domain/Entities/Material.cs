using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class Material
{
    [Key]
    public int Id { get; set; }

    /// <summary>Links to product context, e.g. "petro-gladiator"</summary>
    [Required]
    [MaxLength(200)]
    public string ProductSlug { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Nama { get; set; } = string.Empty;

    public int Order { get; set; }

    public bool IsActive { get; set; } = true;
}
