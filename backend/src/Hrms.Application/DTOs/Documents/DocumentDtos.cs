namespace Hrms.Application.DTOs.Documents;

// ── Templates ────────────────────────────────────────────────────────

public sealed record DocumentTemplateDto(
    Guid Id,
    string Name,
    string Type,
    string HtmlContent,
    string? Description,
    bool IsActive);

public sealed record CreateDocumentTemplateRequestDto(
    string Name,
    string Type,
    string HtmlContent,
    string? Description);

// ── Employee Documents ───────────────────────────────────────────────

public sealed record EmployeeDocumentDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    string EmployeeCode,
    Guid? TemplateId,
    string Title,
    string Type,
    string HtmlContent,
    string Status,
    DateTime? SentForSignatureAtUtc,
    DateTime? SignedAtUtc,
    DateTime? ExpiresAtUtc,
    string? SignedByUserName,
    string? SignatureHash,
    string? RejectionReason,
    DateTime CreatedAtUtc);

public sealed record CreateDocumentRequestDto(
    Guid EmployeeId,
    Guid? TemplateId,
    string Title,
    string Type,
    string HtmlContent,
    DateTime? ExpiresAtUtc);

public sealed record SendForSignatureRequestDto(
    Guid DocumentId);

public sealed record SignDocumentRequestDto(
    string ConfirmationCode);

public sealed record RejectDocumentRequestDto(
    string Reason);
