using Hrms.Application.Interfaces.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.BackgroundJobs;

/// <summary>
/// Periodically expires open attendance incidents whose justification deadline has passed
/// and which have no justification submitted yet. Runs every hour.
/// </summary>
public sealed class AttendanceIncidentExpirationService(
    IServiceScopeFactory scopeFactory,
    ILogger<AttendanceIncidentExpirationService> logger) : BackgroundService
{
    private static readonly TimeSpan RunInterval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("AttendanceIncidentExpirationService started. Interval: {Interval}.", RunInterval);

        // Initial short delay so app startup is not blocked.
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var incidentService = scope.ServiceProvider.GetRequiredService<IAttendanceIncidentService>();

                var expiredCount = await incidentService.ExpireOpenIncidentsAsync(stoppingToken);

                if (expiredCount > 0)
                {
                    logger.LogInformation("Auto-expired {Count} attendance incident(s).", expiredCount);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while running attendance incident expiration job.");
            }

            try
            {
                await Task.Delay(RunInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        logger.LogInformation("AttendanceIncidentExpirationService stopped.");
    }
}
