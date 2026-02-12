using System.ComponentModel.DataAnnotations;

namespace SIPPro.Application.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "Nama lengkap wajib diisi")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Nomor Induk wajib diisi")]
    public string NoInduk { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email wajib diisi")]
    [EmailAddress(ErrorMessage = "Format email tidak valid")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Kata sandi wajib diisi")]
    [MinLength(6, ErrorMessage = "Kata sandi minimal 6 karakter")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Konfirmasi kata sandi wajib diisi")]
    [Compare("Password", ErrorMessage = "Kata sandi tidak cocok")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
