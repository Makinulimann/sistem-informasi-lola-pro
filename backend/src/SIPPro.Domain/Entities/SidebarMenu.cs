using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace SIPPro.Domain.Entities;

public class SidebarMenu
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Label { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Icon { get; set; } = string.Empty; // Lucide icon name

    [MaxLength(200)]
    public string Href { get; set; } = "#";

    public int? ParentId { get; set; }
    
    [ForeignKey("ParentId")]
    [JsonIgnore]
    public virtual SidebarMenu? Parent { get; set; }
    
    [JsonIgnore]
    public virtual ICollection<SidebarMenu> Children { get; set; } = new List<SidebarMenu>();

    public int Order { get; set; }
    public bool IsActive { get; set; } = true;

    [MaxLength(50)]
    public string RoleAccess { get; set; } = "All"; // "All", "Admin,VP", "Admin,VP,KPP", etc.
}
