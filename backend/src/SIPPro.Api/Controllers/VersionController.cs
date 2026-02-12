using Microsoft.AspNetCore.Mvc;
using SIPPro.Application.Interfaces;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VersionController : ControllerBase
{
    private readonly IHealthService _healthService;

    public VersionController(IHealthService healthService)
    {
        _healthService = healthService;
    }

    /// <summary>
    /// Returns the API version information.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetVersion()
    {
        var result = _healthService.GetVersion();
        return Ok(result);
    }
}
