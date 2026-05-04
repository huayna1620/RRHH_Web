using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Hrms.Infrastructure.Services;

/// <summary>
/// Background service que depura la tabla <c>WebhookDeliveries</c> periódicamente para
/// evitar crecimiento ilimitado. Mantiene entregas de los últimos <see cref="RetentionDays"/>
/// días y corre cada <see cref="Interval"/>.
/// </summary>
public sealed class WebhookDeliveryRetentionService(
    IServiceScopeFactory scopeFactory,
    ILogger<WebhookDeliveryRetentionService> logger) : BackgroundService
{
    private const int RetentionDays = 30;
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);
    private static readonly TimeSpan InitialDelay = TimeSpan.FromMinutes(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Evitar correr en el arranque (cuando la BD puede estar migrando).
            await Task.Delay(InitialDelay, stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Fallo en retention sweep de WebhookDeliveries.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                return;
            }
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HrmsDbContext>();

        var cutoff = DateTime.UtcNow.AddDays(-RetentionDays);
        var deleted = await db.WebhookDeliveries
            .Where(d => d.DeliveredAtUtc < cutoff)
            .ExecuteDeleteAsync(ct);

        if (deleted > 0)
        {
            logger.LogInformation(
                "Retention: eliminadas {Count} WebhookDeliveries anteriores a {Cutoff:O}.",
                deleted, cutoff);
        }
    }
}
