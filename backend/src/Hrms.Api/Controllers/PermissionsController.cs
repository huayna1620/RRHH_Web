using Hrms.Application.Common.Authorization;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/permissions")]
[Authorize]
public sealed class PermissionsController(IPermissionService permissionService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.RolesView)]
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var permissions = await permissionService.GetAllAsync(cancellationToken);
        return Ok(permissions);
    }
}
