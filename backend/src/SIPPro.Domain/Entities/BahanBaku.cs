using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SIPPro.Domain.Entities;

public class BahanBaku
{
    [Key]
    public int Id { get; set; }

    /// <summary>Suplai or Mutasi</summary>
    [Required]
    [MaxLength(10)]
    public string Tipe { get; set; } = "Suplai";

    /// <summary>Links to the product context, e.g. "petro-gladiator"</summary>
    [Required]
    [MaxLength(200)]
    public string ProductSlug { get; set; } = string.Empty;

    public int? PerusahaanId { get; set; }

    [ForeignKey("PerusahaanId")]
    [JsonIgnore]
    public virtual Perusahaan? Perusahaan { get; set; }

    public DateTime Tanggal { get; set; }

    [MaxLength(50)]
    public string Jenis { get; set; } = string.Empty;

    [MaxLength(100)]
    public string NamaBahan { get; set; } = string.Empty;

    public double Kuantum { get; set; }

    [MaxLength(100)]
    public string Dokumen { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Keterangan { get; set; } = string.Empty;
}
