namespace Hrms.Application.DTOs.Areas;

public sealed class AreaQueryDto
{
    public string? Search { get; set; }
    public bool? IsActive { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortBy { get; set; } = "name";
    public string SortDirection { get; set; } = "asc";
}

