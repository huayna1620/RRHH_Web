namespace Hrms.Application.DTOs.Reports;

public sealed record RotationReportDto(
    int Year,
    int TotalActiveAtStart,
    int HiredCount,
    int InactivatedCount,
    double TurnoverRate,
    IReadOnlyList<RotationAreaItemDto> ByArea);

public sealed record RotationAreaItemDto(
    Guid AreaId,
    string AreaName,
    int HiredCount,
    int InactivatedCount);
