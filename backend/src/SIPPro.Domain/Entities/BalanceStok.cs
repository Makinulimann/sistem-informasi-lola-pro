using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SIPPro.Domain.Entities;

public class BalanceStok
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string ProductSlug { get; set; } = string.Empty;

    public int? PerusahaanId { get; set; }

    [ForeignKey("PerusahaanId")]
    [JsonIgnore]
    public virtual Perusahaan? Perusahaan { get; set; }

    public DateTime Tanggal { get; set; }

    public double Produksi { get; set; }

    public virtual ICollection<BalanceStokDetail> Details { get; set; } = new List<BalanceStokDetail>();
}
