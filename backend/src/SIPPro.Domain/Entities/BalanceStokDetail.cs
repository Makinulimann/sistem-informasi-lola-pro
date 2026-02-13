using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SIPPro.Domain.Entities;

public class BalanceStokDetail
{
    [Key]
    public int Id { get; set; }

    public int BalanceStokId { get; set; }

    [ForeignKey("BalanceStokId")]
    [JsonIgnore]
    public virtual BalanceStok? BalanceStok { get; set; }

    public int MaterialId { get; set; }

    [ForeignKey("MaterialId")]
    public virtual Material? Material { get; set; }

    public double Out { get; set; }
    public double In { get; set; }
    public double StokAkhir { get; set; }
}
