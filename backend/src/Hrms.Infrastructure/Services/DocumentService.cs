using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Hrms.Application.DTOs.Documents;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

public sealed class DocumentService(
    HrmsDbContext db,
    IIntegrationService integrationService,
    IEmailService emailService,
    ILogger<DocumentService> logger) : IDocumentService
{
    // ── Templates ────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<DocumentTemplateDto>> GetTemplatesAsync(CancellationToken cancellationToken = default)
    {
        var templates = await db.DocumentTemplates
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Type)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return templates.Select(ToTemplateDto).ToList();
    }

    public async Task<DocumentTemplateDto> CreateTemplateAsync(CreateDocumentTemplateRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var entity = new DocumentTemplate
        {
            Name = request.Name,
            Type = request.Type,
            Category = NormalizeTemplateCategory(request.Category, request.Description),
            HtmlContent = request.HtmlContent,
            VariablesJson = JsonSerializer.Serialize(DetectVariables(request.HtmlContent)),
            RequiresEmployeeSignature = request.RequiresEmployeeSignature,
            RequiresHrSignature = request.RequiresHrSignature,
            Format = string.IsNullOrWhiteSpace(request.Format) ? "html" : request.Format.Trim(),
            Description = request.Description,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        db.DocumentTemplates.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Document template {TemplateId} created by {User}", entity.Id, userName);
        return ToTemplateDto(entity);
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

        // Legacy fallback: if the client only sends a template id and no final content,
        // generate a basic document from the template. Modern UI sends resolved HTML.
        if (request.TemplateId.HasValue)
        {
            var template = await db.DocumentTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == request.TemplateId.Value && !x.IsDeleted, cancellationToken);

            if (template is not null && string.IsNullOrWhiteSpace(htmlContent))
            {
                htmlContent = template.HtmlContent
                    .Replace("{{employeeName}}", $"{employee.FirstName} {employee.LastName}")
                    .Replace("{{NOMBRE_COMPLETO}}", $"{employee.FirstName} {employee.LastName}")
                    .Replace("{{employeeCode}}", employee.EmployeeCode)
                    .Replace("{{CODIGO_EMPLEADO}}", employee.EmployeeCode)
                    .Replace("{{CÓDIGO_EMPLEADO}}", employee.EmployeeCode)
                    .Replace("{{documentNumber}}", employee.DocumentNumber)
                    .Replace("{{DNI}}", employee.DocumentNumber)
                    .Replace("{{hireDate}}", employee.HireDate.ToString("dd/MM/yyyy"))
                    .Replace("{{FECHA_INGRESO}}", employee.HireDate.ToString("dd/MM/yyyy"))
                    .Replace("{{currentDate}}", DateTime.UtcNow.ToString("dd/MM/yyyy"))
                    .Replace("{{FECHA_ACTUAL}}", DateTime.UtcNow.ToString("dd/MM/yyyy"))
                    .Replace("{{salary}}", employee.BaseSalary.ToString("N2"))
                    .Replace("{{SUELDO}}", employee.BaseSalary.ToString("N2"));
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
            ExpiresAtUtc = request.ExpiresAtUtc,
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

    public async Task<bool> SendDocumentByEmailAsync(Guid documentId, SendDocumentEmailRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var entity = await db.EmployeeDocuments
            .Include(x => x.Employee)
            .FirstOrDefaultAsync(x => x.Id == documentId && !x.IsDeleted, cancellationToken);
        if (entity is null) return false;

        var employee = entity.Employee;
        var to = NormalizeOptional(request.To) ?? NormalizeOptional(employee.WorkEmail) ?? NormalizeOptional(employee.PersonalEmail);
        if (string.IsNullOrWhiteSpace(to))
        {
            throw new InvalidOperationException("El colaborador no tiene correo configurado.");
        }

        var subject = NormalizeOptional(request.Subject) ?? $"Documento laboral: {entity.Title}";
        var message = NormalizeOptional(request.Message)
            ?? "Adjuntamos el contenido del documento laboral generado desde SAE - RRHH.";
        var html = BuildDocumentEmailHtml(entity, employee, message, userName);

        await emailService.SendAsync(to, subject, html, cancellationToken);

        entity.UpdatedBy = userName;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Document {DocumentId} sent by email to {Email} by {User}", documentId, to, userName);
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
        x.ExpiresAtUtc,
        x.SignedByUserName,
        x.SignatureHash,
        x.RejectionReason,
        x.CreatedAtUtc);

    private static DocumentTemplateDto ToTemplateDto(DocumentTemplate x)
    {
        var variables = DeserializeVariables(x.VariablesJson);
        if (variables.Count == 0)
        {
            variables = DetectVariables(x.HtmlContent);
        }

        return new DocumentTemplateDto(
            x.Id,
            x.Name,
            x.Type,
            x.Category,
            x.HtmlContent,
            variables,
            x.RequiresEmployeeSignature,
            x.RequiresHrSignature,
            x.Format,
            x.Description,
            x.IsActive);
    }

    private static IReadOnlyList<string> DetectVariables(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return [];

        return Regex.Matches(html, @"\{\{\s*([^{}]+?)\s*\}\}")
            .Select(match => match.Groups[1].Value.Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value)
            .ToList();
    }

    private static IReadOnlyList<string> DeserializeVariables(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            return JsonSerializer.Deserialize<IReadOnlyList<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    private static string NormalizeTemplateCategory(string? category, string? description)
    {
        if (!string.IsNullOrWhiteSpace(category)) return category.Trim();
        if (string.IsNullOrWhiteSpace(description)) return "General";

        var trimmed = description.Trim();
        if (!trimmed.StartsWith("[", StringComparison.Ordinal)) return "General";

        var end = trimmed.IndexOf(']');
        return end > 1 ? trimmed[1..end].Trim() : "General";
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string BuildDocumentEmailHtml(EmployeeDocument document, Employee employee, string message, string userName)
    {
        var employeeName = $"{employee.FirstName} {employee.LastName}".Trim();
        var status = StatusLabel(document.Status);
        var issued = document.CreatedAtUtc.ToLocalTime().ToString("dd/MM/yyyy HH:mm");
        var expires = document.ExpiresAtUtc.HasValue
            ? document.ExpiresAtUtc.Value.ToLocalTime().ToString("dd/MM/yyyy")
            : "Sin vencimiento";
        var safeMessage = Html(message).Replace("\n", "<br>");
        var appUrl = "http://localhost:5175/documentos";

        return $"""
            <!doctype html>
            <html lang="es">
            <body style="margin:0;background:#ffffff;padding:20px;font-family:Arial,'Segoe UI',sans-serif;color:#0f172a">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border:1px solid #e5e7eb;border-radius:14px;padding:10px;background:#ffffff">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:12px;overflow:hidden;border:1px solid #e6f3f1;background:#ffffff">
                      <tr>
                        <td style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:24px 28px;color:#ffffff">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width:72px">
                                <div style="width:54px;height:54px;border-radius:12px;background:#ffffff;color:#0d9488;text-align:center;line-height:54px;font-size:20px;font-weight:900;letter-spacing:.04em">SAE</div>
                              </td>
                              <td>
                                <div style="font-size:16px;font-weight:900">SAE - RRHH</div>
                                <div style="font-size:11px;opacity:.92;margin-top:4px">Gestión documental laboral confiable y segura</div>
                              </td>
                              <td style="text-align:right"><div style="display:inline-block;width:38px;height:38px;border:2px solid rgba(255,255,255,.72);border-radius:10px"></div></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:24px 28px 12px">
                          <h1 style="margin:0;color:#0f172a;font-size:20px;line-height:1.25">Hola, {Html(employeeName)}</h1>
                          <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#475569">{safeMessage}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 28px 18px">
                          <div style="border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:16px">
                            <div style="font-size:12px;font-weight:900;color:#0f766e;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px">Detalles del documento</div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                {EmailDetailCard("Colaborador", employeeName, "")}
                                {EmailDetailCard("Tipo de documento", document.Type, "")}
                                {EmailDetailCard("Categoría", "Documentos laborales", "")}
                              </tr>
                              <tr>
                                {EmailDetailCard("Codigo", document.Employee?.EmployeeCode ?? employee.EmployeeCode, "")}
                                {EmailDetailCard("Emisión", issued, "")}
                                {EmailDetailCard("Vencimiento", expires, "")}
                              </tr>
                              <tr>
                                {EmailDetailCard("Estado", status, "")}
                                <td></td>
                                <td></td>
                              </tr>
                            </table>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 18px">
                          <div style="border:1px solid #e2e8f0;border-radius:12px;background:#fcffff;padding:14px">
                            <div style="font-size:12px;font-weight:900;color:#0f766e;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px">Vista previa del documento</div>
                            <div style="width:260px;margin:0 auto;border:1px solid #dbeafe;background:#ffffff;box-shadow:0 10px 28px rgba(15,23,42,.12);border-radius:3px;overflow:hidden">
                              <div style="background:#0d9488;color:#ffffff;padding:10px 12px;font-size:9px;font-weight:900">SAE - RRHH</div>
                              <div style="padding:14px 16px;font-size:10px;line-height:1.5;color:#0f172a;max-height:190px;overflow:hidden">
                                <div style="font-size:13px;font-weight:900;margin-bottom:8px;text-align:center">{Html(document.Title)}</div>
                                <div style="border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;padding:8px;margin-bottom:10px">
                                  <strong>{Html(employeeName)}</strong><br>
                                  {Html(document.Employee?.EmployeeCode ?? employee.EmployeeCode)}<br>
                                  {Html(status)}
                                </div>
                                {document.HtmlContent}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 28px 22px">
                          <a href="{appUrl}" style="display:block;background:#0d9488;color:#ffffff;text-decoration:none;border-radius:8px;padding:13px 18px;text-align:center;font-size:13px;font-weight:900;margin-bottom:10px">Ver documento</a>
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-right:6px"><a href="{appUrl}" style="display:block;border:1px solid #0d9488;color:#0d9488;text-decoration:none;border-radius:8px;padding:11px 14px;text-align:center;font-size:12px;font-weight:900">Descargar PDF</a></td>
                              <td style="padding-left:6px"><a href="{appUrl}" style="display:block;border:1px solid #0d9488;color:#0d9488;text-decoration:none;border-radius:8px;padding:11px 14px;text-align:center;font-size:12px;font-weight:900">Firmar digitalmente</a></td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;color:#64748b;font-size:11px;line-height:1.45">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td><strong style="color:#0f766e">SAE - RRHH</strong><br>Gestión documental laboral</td>
                              <td style="text-align:center">soporte@sae-rrhh.com</td>
                              <td style="text-align:right">Mensaje automático<br>No responder este correo</td>
                            </tr>
                          </table>
                          <div style="margin-top:10px;color:#94a3b8">Enviado desde SAE - RRHH por {Html(userName)}.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static string EmailDetailCard(string label, string? value, string icon) =>
        $"""
        <td style="width:33.33%;padding:8px 8px 12px;vertical-align:top">
          <div style="width:22px;height:22px;border-radius:999px;border:1px solid #8dd5ce;background:#effdfa"></div>
          <div style="font-size:8px;font-weight:900;text-transform:uppercase;color:#64748b;margin-top:5px;letter-spacing:.04em">{Html(label)}</div>
          <div style="font-size:11px;font-weight:800;color:#0f172a;margin-top:3px;line-height:1.25">{Html(value)}</div>
        </td>
        """;

    private static string EmailRow(string label, string? value) =>
        $"""
        <tr>
          <td style="padding:10px 18px;border-bottom:1px solid #e2e8f0;width:34%;font-weight:800;color:#64748b">{Html(label)}</td>
          <td style="padding:10px 18px;border-bottom:1px solid #e2e8f0;color:#0f172a">{Html(value)}</td>
        </tr>
        """;

    private static string Html(string? value) => System.Net.WebUtility.HtmlEncode(value ?? string.Empty);

    private static string StatusLabel(string status) => status switch
    {
        "draft" => "Borrador",
        "pending_signature" => "Pendiente de firma",
        "signed" => "Firmado",
        "rejected" => "Rechazado",
        _ => status
    };
}
