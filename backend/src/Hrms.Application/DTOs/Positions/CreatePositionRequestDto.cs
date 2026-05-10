namespace Hrms.Application.DTOs.Positions;

public sealed class CreatePositionRequestDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Level { get; set; }
    public Guid? AreaId { get; set; }
    public Guid? ReportsToEmployeeId { get; set; }
}

