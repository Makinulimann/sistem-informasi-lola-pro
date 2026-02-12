namespace SIPPro.Application.DTOs;

public sealed record HealthResponse(
    string Status,
    string Service,
    string Timestamp
);
