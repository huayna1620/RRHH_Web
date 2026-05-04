using System.Security.Claims;
using Hrms.Application.Common.Authorization;
using Hrms.Application.DTOs.Documents;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/documents")]
[Authorize]
public sealed class DocumentsController(IDocumentService documentService) : ControllerBase
{
    private string GetUserName() => User.FindFirstValue(ClaimTypes.Name) ?? "system";

    // ── Templates ────────────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.DocumentsView)]
    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates(CancellationToken cancellationToken)
    {
        var result = await documentService.GetTemplatesAsync(cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.DocumentsCreate)]
    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateDocumentTemplateRequestDto request, CancellationToken cancellationToken)
    {
        var result = await documentService.CreateTemplateAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/documents/templates/{result.Id}", result);
    }

    [Authorize(Policy = AppPermissions.DocumentsEdit)]
    [HttpDelete("templates/{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await documentService.DeleteTemplateAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    // ── Documents ────────────────────────────────────────────────────────

    [Authorize(Policy = AppPermissions.DocumentsView)]
    [HttpGet]
    public async Task<IActionResult> GetDocuments([FromQuery] Guid? employeeId, [FromQuery] string? status, CancellationToken cancellationToken)
    {
        var result = await documentService.GetDocumentsAsync(employeeId, status, cancellationToken);
        return Ok(result);
    }

    [Authorize(Policy = AppPermissions.DocumentsView)]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDocument(Guid id, CancellationToken cancellationToken)
    {
        var result = await documentService.GetDocumentAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [Authorize(Policy = AppPermissions.DocumentsCreate)]
    [HttpPost]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequestDto request, CancellationToken cancellationToken)
    {
        var result = await documentService.CreateDocumentAsync(request, GetUserName(), cancellationToken);
        return Created($"/api/v1/documents/{result.Id}", result);
    }

    [Authorize(Policy = AppPermissions.DocumentsEdit)]
    [HttpPost("{id:guid}/send")]
    public async Task<IActionResult> SendForSignature(Guid id, CancellationToken cancellationToken)
    {
        var sent = await documentService.SendForSignatureAsync(id, GetUserName(), cancellationToken);
        return sent ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/sign")]
    public async Task<IActionResult> SignDocument(Guid id, CancellationToken cancellationToken)
    {
        var signed = await documentService.SignDocumentAsync(id, GetUserName(), cancellationToken);
        return signed ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectDocument(Guid id, [FromBody] RejectDocumentRequestDto request, CancellationToken cancellationToken)
    {
        var rejected = await documentService.RejectDocumentAsync(id, request.Reason, GetUserName(), cancellationToken);
        return rejected ? NoContent() : NotFound();
    }

    // ── My Documents (Employee Portal) ───────────────────────────────────

    [HttpGet("my")]
    public async Task<IActionResult> GetMyDocuments(CancellationToken cancellationToken)
    {
        var result = await documentService.GetMyDocumentsAsync(GetUserName(), cancellationToken);
        return Ok(result);
    }
}
