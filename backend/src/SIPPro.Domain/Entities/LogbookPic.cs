using System.ComponentModel.DataAnnotations;

namespace SIPPro.Domain.Entities;

public class LogbookPic
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Nama { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
