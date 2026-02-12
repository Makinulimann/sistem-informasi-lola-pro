using SIPPro.Application.DTOs;

namespace SIPPro.Application.Interfaces;

public interface IHealthService
{
    HealthResponse GetHealth();
    VersionResponse GetVersion();
}
