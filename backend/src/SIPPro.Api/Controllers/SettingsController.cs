using Microsoft.AspNetCore.Mvc;
using SIPPro.Application.Interfaces;

namespace SIPPro.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    private readonly IAppSettingService _appSettingService;

    public SettingsController(IAppSettingService appSettingService)
    {
        _appSettingService = appSettingService;
    }

    /// <summary>
    /// Returns a setting value by key from the database.
    /// </summary>
    /// <param name="key">The setting key (e.g. "app-name").</param>
    [HttpGet("{key}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByKey(string key, CancellationToken cancellationToken)
    {
        var result = await _appSettingService.GetByKeyAsync(key, cancellationToken);

        if (result is null)
            return NotFound(new { message = $"Setting '{key}' not found." });

        return Ok(result);
    }
}
