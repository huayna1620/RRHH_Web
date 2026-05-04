using System.Security.Cryptography;
using System.Text;
using Hrms.Application.DTOs.Documents;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

public sealed class DocumentService(HrmsDbContext db, IIntegrationService integrationService, ILogger<DocumentService> logger) : IDocumentService
{
    // ── Templates ────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<DocumentTemplateDto>> GetTemplatesAsync(CancellationToken cancellationToken = default)
    {
        return await db.DocumentTemplates
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Type)
            .ThenBy(x => x.Name)
            .Select(x => new DocumentTemplateDto(x.Id, x.Name, x.Type, x.HtmlContent, x.Description, x.IsActive))
            .ToListAsync(cancellationToken);
    }

    public async Task<DocumentTemplateDto> CreateTemplateAsync(CreateDocumentTemplateRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var entity = new DocumentTemplate
        {
            Name = request.Name,
            Type = request.Type,
            HtmlContent = request.HtmlContent,
            Description = request.Description,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        db.DocumentTemplates.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Document template {TemplateId} created by {User}", entity.Id, userName);
        return new DocumentTemplateDto(entity.Id, entity.Name, entity.Type, entity.HtmlContent, entity.Description, entity.IsActive);
    }

    public async Task<bool> DeleteTemplateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await db.DocumentTemplates.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (entity is null) return false;

        entity.IsDeleted = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    // ── Documents ────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(Guid? employeeId, string? status, CancellationToken cancellationToken = default)
    {
        var query = db.EmployeeDocuments
            .AsNoTracking()
            .Include(x => x.Employee)
            .Where(x => !x.IsDeleted);

        if (employeeId.HasValue)
            query = query.Where(x => x.EmployeeId == employeeId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        return await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => MapToDto(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<EmployeeDocumentDto?> GetDocumentAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await db.EmployeeDocuments
            .AsNoTracking()
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<EmployeeDocumentDto> CreateDocumentAsync(CreateDocumentRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var employee = await db.Employees
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.EmployeeId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Empleado no encontrado.");

        var htmlContent = request.HtmlContent;

        // If template is provided, use it as base and replace placeholders
        if (request.TemplateId.HasValue)
        {
            var template = await db.DocumentTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == request.TemplateId.Value && !x.IsDeleted, cancellationToken);

            if (template is not null)
            {
                htmlContent = template.HtmlContent
                    .Replace("{{employeeName}}", $"{employee.FirstName} {employee.LastName}")
                    .Replace("{{employeeCode}}", employee.EmployeeCode)
                    .Replace("{{documentNumber}}", employee.DocumentNumber)
                    .Replace("{{hireDate}}", employee.HireDate.ToString("dd/MM/yyyy"))
                    .Replace("{{currentDate}}", DateTime.UtcNow.ToString("dd/MM/yyyy"))
                    .Replace("{{salary}}", employee.BaseSalary.ToString("N2"));
            }
        }

        var now = DateTime.UtcNow;
        var entity = new EmployeeDocument
        {
            EmployeeId = request.EmployeeId,
            TemplateId = request.TemplateId,
            Title = request.Title,
            Type = request.Type,
            HtmlContent = htmlContent,
            Status = "draft",
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        db.EmployeeDocuments.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        // Reload with employee for DTO
        await db.Entry(entity).Reference(x => x.Employee).LoadAsync(cancellationToken);

        logger.LogInformation("Document {DocumentId} created for employee {EmployeeId} by {User}", entity.Id, request.EmployeeId, userName);
        return MapToDto(entity);
    }

    public async Task<bool> SendForSignatureAsync(Guid documentId, string userName, CancellationToken cancellationToken = default)
    {
        var entity = await db.EmployeeDocuments.FirstOrDefaultAsync(x => x.Id == documentId && !x.IsDeleted, cancellationToken);
        if (entity is null || entity.Status != "draft") return false;

        entity.Status = "pending_signature";
        entity.SentForSignatureAtUtc = DateTime.UtcNow;
        entity.UpdatedBy = userName;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Document {DocumentId} sent for signature by {User}", documentId, userName);
        return true;
    }

    public async Task<bool> SignDocumentAsync(Guid documentId, string userName, CancellationToken cancellationToken = default)
    {
        var entity = await db.EmployeeDocuments.FirstOrDefaultAsync(x => x.Id == documentId && !x.IsDeleted, cancellationToken);
        if (entity is null || entity.Status != "pending_signature") return false;

        var now = DateTime.UtcNow;

        // Generate signature hash from document content + user + timestamp
        var signatureData = $"{entity.HtmlContent}|{userName}|{now:O}|{entity.Id}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(signatureData));
        var signatureHash = Convert.ToBase64String(hashBytes);

        entity.Status = "signed";
        entity.SignedAtUtc = now;
        entity.SignedByUserName = userName;
        entity.SignatureHash = signatureHash;
        entity.UpdatedBy = userName;
        entity.UpdatedAtUtc = now;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Document {DocumentId} signed by {User}, hash: {Hash}", documentId, userName, signatureHash[..16]);

        await integrationService.DispatchEventAsync("document.signed", new
        {
            documentId = entity.Id,
            title = entity.Title,
            documentType = entity.Type,
            employeeId = entity.EmployeeId,
            signedBy = userName,
            signedAtUtc = now,
            signatureHash
        }, cancellationToken);

        return true;
    }

    public async Task<bool> RejectDocumentAsync(Guid documentId, string reason, string userName, CancellationToken cancellationToken = default)
    {
        var entity = await db.EmployeeDocuments.FirstOrDefaultAsync(x => x.Id == documentId && !x.IsDeleted, cancellationToken);
        if (entity is null || entity.Status != "pending_signature") return false;

        entity.Status = "rejected";
        entity.RejectionReason = reason;
        entity.UpdatedBy = userName;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Document {DocumentId} rejected by {User}: {Reason}", documentId, userName, reason);
        return true;
    }

    public async Task<IReadOnlyList<EmployeeDocumentDto>> GetMyDocumentsAsync(string userName, CancellationToken cancellationToken = default)
    {
        // Find employee linked to the current user
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserName == userName, cancellationToken);
        if (user?.EmployeeId is null) return [];

        return await db.EmployeeDocuments
            .AsNoTracking()
            .Include(x => x.Employee)
            .Where(x => x.EmployeeId == user.EmployeeId.Value && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => MapToDto(x))
            .ToListAsync(cancellationToken);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static EmployeeDocumentDto MapToDto(EmployeeDocument x) => new(
        x.Id,
        x.EmployeeId,
        $"{x.Employee.FirstName} {x.Employee.LastName}",
        x.Employee.EmployeeCode,
        x.TemplateId,
        x.Title,
        x.Type,
        x.HtmlContent,
        x.Status,
        x.SentForSignatureAtUtc,
        x.SignedAtUtc,
        x.SignedByUserName,
        x.SignatureHash,
        x.RejectionReason,
        x.CreatedAtUtc);
}
