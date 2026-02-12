using SIPPro.Application.DTOs;
using SIPPro.Application.Interfaces;

namespace SIPPro.Application.Services;

public sealed class HealthService : IHealthService
{
    public HealthResponse GetHealth()
    {
        return new HealthResponse(
            Status: "ok",
            Service: "sippro-api",
            Timestamp: DateTime.UtcNow.ToString("o")
        );
    }

    public VersionResponse GetVersion()
    {
        return new VersionResponse(
            Name: "SIPPro",
            ApiVersion: "v1"
        );
    }
}
