namespace Hrms.Application.DTOs.Configuration;

public sealed record CreateConfigurationItemRequestDto(
    string Code,
    string Name,
    string? BranchType = null,
    string? Description = null,
    string? Country = null,
    string? Region = null,
    string? City = null,
    string? Address = null,
    string? Phone = null,
    string? Email = null,
    string? ResponsibleName = null,
    string? ResponsibleTitle = null,
    int? Capacity = null,
    string? BusinessHours = null,
    string? CostCenter = null,
    DateTime? OpenedAtUtc = null,
    bool? IsActive = null,
    bool? VisibleForAssignments = null,
    bool? RequiresApprovalForChanges = null);
