namespace Hrms.Application.DTOs.Areas;

public sealed class UpdateAreaRequestDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ResponsibleEmployeeId { get; set; }
}

