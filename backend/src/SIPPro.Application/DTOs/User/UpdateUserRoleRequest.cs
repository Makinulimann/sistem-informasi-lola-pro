using System.ComponentModel.DataAnnotations;

namespace SIPPro.Application.DTOs.User;

public class UpdateUserRoleRequest
{
    [Required]
    public string Role { get; set; } = string.Empty;
}
