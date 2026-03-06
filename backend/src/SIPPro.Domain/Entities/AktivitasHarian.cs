using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class AktivitasHarian
{
    [Key]
    public int Id { get; set; }

    public DateTime Tanggal { get; set; }

    [Required]
    [MaxLength(100)]
    public string Pic { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Lokasi { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Deskripsi { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Dokumentasi { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
