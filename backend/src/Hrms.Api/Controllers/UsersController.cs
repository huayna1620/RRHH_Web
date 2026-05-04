using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Users;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize]
public sealed class UsersController(IUserService userService) : ControllerBase
{
    [Authorize(Policy = AppPermissions.UsersView)]
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var users = await userService.GetAllAsync(cancellationToken);
        return Ok(users);
    }

    [Authorize(Policy = AppPermissions.UsersView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [Authorize(Policy = AppPermissions.UsersCreate)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequestDto request, CancellationToken cancellationToken)
    {
        var user = await userService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [Authorize(Policy = AppPermissions.UsersEdit)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequestDto request, CancellationToken cancellationToken)
    {
        var user = await userService.UpdateAsync(id, request, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [Authorize(Policy = AppPermissions.UsersEdit)]
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequestDto request, CancellationToken cancellationToken)
    {
        var updated = await userService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }
}
