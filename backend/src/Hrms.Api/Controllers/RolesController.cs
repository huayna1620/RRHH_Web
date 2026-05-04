using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Roles;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/roles")]
[Authorize]
public sealed class RolesController(IRoleService roleService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.RolesView)]
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var roles = await roleService.GetAllAsync(cancellationToken);
        return Ok(roles);
    }

    [Authorize(Policy = AppPermissions.RolesEdit)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequestDto request, CancellationToken cancellationToken)
    {
        var role = await roleService.CreateAsync(request, cancellationToken);
        return Ok(role);
    }

    [Authorize(Policy = AppPermissions.RolesView)]
    [HttpGet("{id:guid}/permissions")]
    public async Task<IActionResult> GetPermissions(Guid id, CancellationToken cancellationToken)
    {
        var permissionIds = await roleService.GetPermissionIdsByRoleIdAsync(id, cancellationToken);
        return Ok(permissionIds);
    }

    [Authorize(Policy = AppPermissions.RolesEdit)]
    [HttpPut("{id:guid}/permissions")]
    public async Task<IActionResult> UpdatePermissions(Guid id, [FromBody] UpdateRolePermissionsRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await roleService.UpdatePermissionsAsync(id, request.PermissionIds, cancellationToken);
        return updated ? NoContent() : NotFound();
    }
}
