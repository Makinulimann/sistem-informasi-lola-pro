using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class Perusahaan
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Nama { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
