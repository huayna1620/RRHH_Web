using Hrms.Domain.Common;

namespace Hrms.Domain.Entities;

public sealed class DocumentTemplate : AuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // contract, certificate, receipt, memo
    public string Category { get; set; } = string.Empty;
    public string HtmlContent { get; set; } = string.Empty;
    public string VariablesJson { get; set; } = "[]";
    public bool RequiresEmployeeSignature { get; set; }
    public bool RequiresHrSignature { get; set; }
    public string Format { get; set; } = "html";
    public string? Description { get; set; }
}
