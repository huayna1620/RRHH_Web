namespace Hrms.Application.DTOs.Documents;

// ── Templates ────────────────────────────────────────────────────────

public sealed record DocumentTemplateDto(
    Guid Id,
    string Name,
    string Type,
    string Category,
    string HtmlContent,
    IReadOnlyList<string> Variables,
    bool RequiresEmployeeSignature,
    bool RequiresHrSignature,
    string Format,
    string? Description,
    bool IsActive);

public sealed record CreateDocumentTemplateRequestDto(
    string Name,
    string Type,
    string HtmlContent,
    string? Description,
    string? Category = null,
    bool RequiresEmployeeSignature = false,
    bool RequiresHrSignature = false,
    string? Format = null);

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

public sealed record SendDocumentEmailRequestDto(
    string? To,
    string? Subject,
    string? Message);
