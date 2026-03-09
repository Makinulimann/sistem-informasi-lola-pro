using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class Maintenance
{
    [Key]
    public int Id { get; set; }

    public DateTime Tanggal { get; set; }

    [Required]
    [MaxLength(200)]
    public string Equipment { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Area { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Kegiatan { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Keterangan { get; set; }

    [MaxLength(500)]
    public string? Dokumentasi { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
