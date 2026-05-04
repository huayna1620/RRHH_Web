using Hrms.Application.Interfaces.Persistence;
using Hrms.Application.Interfaces.Security;
using Hrms.Application.Interfaces.Services;
using Hrms.Infrastructure.BackgroundJobs;
using Hrms.Infrastructure.Options;
using Hrms.Infrastructure.Persistence.Context;
using Hrms.Infrastructure.Repositories;
using Hrms.Infrastructure.Security;
using Hrms.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Hrms.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' no configurada.");

        services.AddDbContext<HrmsDbContext>(options =>
            options.UseSqlServer(connectionString, sql =>
                sql.MigrationsAssembly(typeof(HrmsDbContext).Assembly.FullName)));

        var jwtSection = configuration.GetSection(JwtOptions.SectionName);

        services.AddOptions<JwtOptions>()
            .Configure(options =>
            {
                options.Issuer = jwtSection["Issuer"] ?? string.Empty;
                options.Audience = jwtSection["Audience"] ?? string.Empty;
                options.Secret = jwtSection["Secret"] ?? string.Empty;
                options.AccessTokenMinutes = int.TryParse(jwtSection["AccessTokenMinutes"], out var accessMinutes) ? accessMinutes : 30;
                options.RefreshTokenDays = int.TryParse(jwtSection["RefreshTokenDays"], out var refreshDays) ? refreshDays : 7;
            })
            .Validate(options => !string.IsNullOrWhiteSpace(options.Secret) && options.Secret.Length >= 32,
                "Jwt:Secret debe tener al menos 32 caracteres.")
            .ValidateOnStart();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

        services.AddScoped<IPasswordHasherService, PasswordHasherService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IRoleService, RoleService>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IEmployeeService, EmployeeService>();
        services.AddScoped<IAreaService, AreaService>();
        services.AddScoped<IPositionService, PositionService>();
        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IAttendanceIncidentService, AttendanceIncidentService>();
        services.AddScoped<IPayrollConceptService, PayrollConceptService>();
        services.AddScoped<IPayrollLoanService, PayrollLoanService>();

        // Background jobs
        services.AddHostedService<AttendanceIncidentExpirationService>();
        services.AddScoped<IVacationService, VacationService>();
        services.AddScoped<ILeaveService, LeaveService>();
        services.AddScoped<IPayrollService, PayrollService>();
        services.AddScoped<IHolidayService, HolidayService>();
        services.AddScoped<IRecruitmentService, RecruitmentService>();
        services.AddScoped<IJobPostingService, JobPostingService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IConfigurationService, ConfigurationService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<IExcelExportService, ExcelExportService>();
        services.AddScoped<IEmployeePdfService, EmployeePdfService>();
        services.AddScoped<IOnboardingService, OnboardingService>();
        services.AddScoped<IEvaluationService, EvaluationService>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IIntegrationService, IntegrationService>();
        services.AddScoped<IBankFileService, Services.BankFiles.BankFileService>();
        services.AddScoped<ICalendarFeedService, Services.Calendar.CalendarFeedService>();

        // Google Calendar OAuth push — cifrado de tokens en reposo.
        services.AddDataProtection();
        services.AddOptions<GoogleCalendarOptions>()
            .Bind(configuration.GetSection(GoogleCalendarOptions.SectionName));
        services.AddScoped<IGoogleCalendarOAuthService, Services.Calendar.GoogleCalendarOAuthService>();
        services.AddScoped<Services.Calendar.GoogleCalendarProvider>();
        services.AddHttpClient("google-oauth", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        // Microsoft Graph / Outlook Calendar OAuth push
        services.AddOptions<MicrosoftCalendarOptions>()
            .Bind(configuration.GetSection(MicrosoftCalendarOptions.SectionName));
        services.AddScoped<IMicrosoftCalendarOAuthService, Services.Calendar.MicrosoftCalendarOAuthService>();
        services.AddScoped<Services.Calendar.MicrosoftCalendarProvider>();
        services.AddHttpClient("microsoft-oauth", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });
        services.AddHttpClient("microsoft-graph", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddScoped<ICalendarSyncService, Services.Calendar.CalendarSyncService>();

        services.AddHttpClient("webhooks", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        // Retención: limpia WebhookDeliveries > 30 días cada 6 horas.
        services.AddHostedService<WebhookDeliveryRetentionService>();

        // Email
        var smtpSection = configuration.GetSection(SmtpOptions.SectionName);
        services.AddOptions<SmtpOptions>()
            .Bind(smtpSection);
        services.AddScoped<IEmailService, EmailService>();

        return services;
    }
}

