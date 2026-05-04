using Hrms.Application.DTOs.Documents;

namespace Hrms.Application.Interfaces.Services;

public interface IDocumentService
{
    // Templates
    Task<IReadOnlyList<DocumentTemplateDto>> GetTemplatesAsync(CancellationToken cancellationToken = default);
    Task<DocumentTemplateDto> CreateTemplateAsync(CreateDocumentTemplateRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<bool> DeleteTemplateAsync(Guid id, CancellationToken cancellationToken = default);

    // Documents
    Task<IReadOnlyList<EmployeeDocumentDto>> GetDocumentsAsync(Guid? employeeId, string? status, CancellationToken cancellationToken = default);
    Task<EmployeeDocumentDto?> GetDocumentAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EmployeeDocumentDto> CreateDocumentAsync(CreateDocumentRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<bool> SendForSignatureAsync(Guid documentId, string userName, CancellationToken cancellationToken = default);
    Task<bool> SignDocumentAsync(Guid documentId, string userName, CancellationToken cancellationToken = default);
    Task<bool> RejectDocumentAsync(Guid documentId, string reason, string userName, CancellationToken cancellationToken = default);

    // My documents (employee portal)
    Task<IReadOnlyList<EmployeeDocumentDto>> GetMyDocumentsAsync(string userName, CancellationToken cancellationToken = default);
}
