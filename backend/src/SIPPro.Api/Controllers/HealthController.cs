using Microsoft.AspNetCore.Mvc;
using SIPPro.Application.Interfaces;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IHealthService _healthService;

    public HealthController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    /// <summary>
    /// Returns the current health status of the API.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetHealth()
    {
        var result = _healthService.GetHealth();
        return Ok(result);
    }
}
