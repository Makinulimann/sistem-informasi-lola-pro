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

    public double JumlahProduksi { get; set; }

    public double Keluar { get; set; }

    public double Kumulatif { get; set; }

    public double StokAkhir { get; set; }

    public double COA { get; set; }

    [MaxLength(500)]
    public string Keterangan { get; set; } = string.Empty;
}
