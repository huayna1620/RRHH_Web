using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class EmployeeDocument : AuditableEntity
{
    public Guid EmployeeId { get; set; }
    public Guid? TemplateId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // contract, certificate, receipt, memo
    public string HtmlContent { get; set; } = string.Empty;
    public string Status { get; set; } = "draft"; // draft, pending_signature, signed, rejected
    public DateTime? SentForSignatureAtUtc { get; set; }
    public DateTime? SignedAtUtc { get; set; }
    public DateTime? ExpiresAtUtc { get; set; }
    public string? SignedByUserName { get; set; }
    public string? SignatureHash { get; set; }
    public string? RejectionReason { get; set; }

    public Employee Employee { get; set; } = null!;
    public DocumentTemplate? Template { get; set; }
}
