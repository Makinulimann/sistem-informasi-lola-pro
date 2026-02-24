using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SIPPro.Domain.Entities;

public class Produksi
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProductSlug { get; set; } = string.Empty;

    public int ProduksiTabId { get; set; }

    [ForeignKey("ProduksiTabId")]
    [JsonIgnore]
    public virtual ProduksiTab? ProduksiTab { get; set; }

    public DateTime Tanggal { get; set; }

    public double BS { get; set; } // Belum Sampling

    public double PS { get; set; } // Proses Sampling

    public double COA { get; set; }

    public double PG { get; set; } // Pengiriman Gudang

    public double Kumulatif { get; set; }

    public double StokAkhir { get; set; }

    [MaxLength(500)]
    public string Keterangan { get; set; } = string.Empty;
}
