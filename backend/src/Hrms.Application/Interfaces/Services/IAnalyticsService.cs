using Hrms.Application.DTOs.Analytics;

namespace Hrms.Application.Interfaces.Services;

public interface IAnalyticsService
{
    Task<AnalyticsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HeadcountTrendDto>> GetHeadcountTrendAsync(int months, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LaborCostTrendDto>> GetLaborCostTrendAsync(int months, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AttendanceTrendDto>> GetAttendanceTrendAsync(int months, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AreaDistributionDto>> GetAreaDistributionAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TurnoverRiskDto>> GetTurnoverRiskAsync(int top, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CostProjectionDto>> GetCostProjectionAsync(int months, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<YearComparisonDto>> GetYearComparisonAsync(int year, CancellationToken cancellationToken = default);
}
