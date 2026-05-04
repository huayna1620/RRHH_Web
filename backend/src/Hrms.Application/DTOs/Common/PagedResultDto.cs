namespace Hrms.Application.DTOs.Common;

public sealed record PagedResultDto<T>(
    IReadOnlyList<T> Items,
    int PageNumber,
    int PageSize,
    int TotalCount);
