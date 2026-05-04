using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Configuration;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/configuration")]
[Authorize]
public sealed class ConfigurationController(IConfigurationService configurationService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.ConfigurationView)]
    [HttpGet("branches")]
    public async Task<IActionResult> GetBranches([FromQuery] ConfigurationQueryDto query, CancellationToken cancellationToken)
    {
        var result = await configurationService.GetBranchesAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ConfigurationView)]
    [HttpGet("branches/{id:guid}")]
    public async Task<IActionResult> GetBranchById(Guid id, CancellationToken cancellationToken)
    {
        var branch = await configurationService.GetBranchByIdAsync(id, cancellationToken);
        return branch is null ? NotFound() : Ok(branch);
    }

    [Authorize(Policy = AppPermissions.ConfigurationCreate)]
    [HttpPost("branches")]
    public async Task<IActionResult> CreateBranch([FromBody] CreateConfigurationItemRequestDto request, CancellationToken cancellationToken)
    {
        var branch = await configurationService.CreateBranchAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetBranchById), new { id = branch.Id }, branch);
    }

    [Authorize(Policy = AppPermissions.ConfigurationEdit)]
    [HttpPut("branches/{id:guid}")]
    public async Task<IActionResult> UpdateBranch(Guid id, [FromBody] UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken)
    {
        var branch = await configurationService.UpdateBranchAsync(id, request, cancellationToken);
        return branch is null ? NotFound() : Ok(branch);
    }

    [Authorize(Policy = AppPermissions.ConfigurationEdit)]
    [HttpPatch("branches/{id:guid}/status")]
    public async Task<IActionResult> UpdateBranchStatus(Guid id, [FromBody] UpdateConfigurationItemStatusRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await configurationService.UpdateBranchStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.ConfigurationDelete)]
    [HttpDelete("branches/{id:guid}")]
    public async Task<IActionResult> DeleteBranch(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await configurationService.DeleteBranchAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.ConfigurationView)]
    [HttpGet("contract-types")]
    public async Task<IActionResult> GetContractTypes([FromQuery] ConfigurationQueryDto query, CancellationToken cancellationToken)
    {
        var result = await configurationService.GetContractTypesAsync(query, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.ConfigurationView)]
    [HttpGet("contract-types/{id:guid}")]
    public async Task<IActionResult> GetContractTypeById(Guid id, CancellationToken cancellationToken)
    {
        var contractType = await configurationService.GetContractTypeByIdAsync(id, cancellationToken);
        return contractType is null ? NotFound() : Ok(contractType);
    }

    [Authorize(Policy = AppPermissions.ConfigurationCreate)]
    [HttpPost("contract-types")]
    public async Task<IActionResult> CreateContractType([FromBody] CreateConfigurationItemRequestDto request, CancellationToken cancellationToken)
    {
        var contractType = await configurationService.CreateContractTypeAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetContractTypeById), new { id = contractType.Id }, contractType);
    }

    [Authorize(Policy = AppPermissions.ConfigurationEdit)]
    [HttpPut("contract-types/{id:guid}")]
    public async Task<IActionResult> UpdateContractType(Guid id, [FromBody] UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken)
    {
        var contractType = await configurationService.UpdateContractTypeAsync(id, request, cancellationToken);
        return contractType is null ? NotFound() : Ok(contractType);
    }

    [Authorize(Policy = AppPermissions.ConfigurationEdit)]
    [HttpPatch("contract-types/{id:guid}/status")]
    public async Task<IActionResult> UpdateContractTypeStatus(Guid id, [FromBody] UpdateConfigurationItemStatusRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await configurationService.UpdateContractTypeStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.ConfigurationDelete)]
    [HttpDelete("contract-types/{id:guid}")]
    public async Task<IActionResult> DeleteContractType(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await configurationService.DeleteContractTypeAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [Authorize(Policy = AppPermissions.ConfigurationView)]
    [HttpGet("general-settings")]
    public async Task<IActionResult> GetGeneralSettings([FromQuery] GeneralSettingsQueryDto query, CancellationToken cancellationToken)
    {
        var items = await configurationService.GetGeneralSettingsAsync(query, cancellationToken);
        return Ok(items);
    }

    [Authorize(Policy = AppPermissions.ConfigurationEdit)]
    [HttpPut("general-settings/{key}")]
    public async Task<IActionResult> UpsertGeneralSetting(string key, [FromBody] UpsertGeneralSettingRequestDto request, CancellationToken cancellationToken)
    {
        var item = await configurationService.UpsertGeneralSettingAsync(key, request, cancellationToken);
        return Ok(item);
    }

    [Authorize(Policy = AppPermissions.ConfigurationDelete)]
    [HttpDelete("general-settings/{id:guid}")]
    public async Task<IActionResult> DeleteGeneralSetting(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await configurationService.DeleteGeneralSettingAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
