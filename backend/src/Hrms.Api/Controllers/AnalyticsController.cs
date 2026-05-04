using Hrms.Application.Common.Authorization;
using Hrms.Application.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Hrms.Api.Controllers;

[ApiController]
[Route("api/v1/analytics")]
[Authorize(Policy = AppPermissions.AnalyticsView)]
[EnableRateLimiting("heavy")]
public sealed class AnalyticsController(IAnalyticsService analyticsService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var result = await analyticsService.GetSummaryAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("headcount-trend")]
    public async Task<IActionResult> GetHeadcountTrend([FromQuery] int months = 12, CancellationToken cancellationToken = default)
    {
        var result = await analyticsService.GetHeadcountTrendAsync(Math.Clamp(months, 3, 24), cancellationToken);
        return Ok(result);
    }

    [HttpGet("labor-cost-trend")]
    public async Task<IActionResult> GetLaborCostTrend([FromQuery] int months = 12, CancellationToken cancellationToken = default)
    {
        var result = await analyticsService.GetLaborCostTrendAsync(Math.Clamp(months, 3, 24), cancellationToken);
        return Ok(result);
    }

    [HttpGet("attendance-trend")]
    public async Task<IActionResult> GetAttendanceTrend([FromQuery] int months = 12, CancellationToken cancellationToken = default)
    {
        var result = await analyticsService.GetAttendanceTrendAsync(Math.Clamp(months, 3, 24), cancellationToken);
        return Ok(result);
    }

    [HttpGet("area-distribution")]
    public async Task<IActionResult> GetAreaDistribution(CancellationToken cancellationToken)
    {
        var result = await analyticsService.GetAreaDistributionAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("turnover-risk")]
    public async Task<IActionResult> GetTurnoverRisk([FromQuery] int top = 10, CancellationToken cancellationToken = default)
    {
        var result = await analyticsService.GetTurnoverRiskAsync(Math.Clamp(top, 5, 50), cancellationToken);
        return Ok(result);
    }

    [HttpGet("cost-projection")]
    public async Task<IActionResult> GetCostProjection([FromQuery] int months = 6, CancellationToken cancellationToken = default)
    {
        var result = await analyticsService.GetCostProjectionAsync(Math.Clamp(months, 3, 12), cancellationToken);
        return Ok(result);
    }

    [HttpGet("year-comparison")]
    public async Task<IActionResult> GetYearComparison([FromQuery] int? year, CancellationToken cancellationToken = default)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var result = await analyticsService.GetYearComparisonAsync(targetYear, cancellationToken);
        return Ok(result);
    }
}
