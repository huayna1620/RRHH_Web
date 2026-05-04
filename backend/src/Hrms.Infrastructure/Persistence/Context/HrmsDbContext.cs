using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Persistence.Context;

public sealed class HrmsDbContext(DbContextOptions<HrmsDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Area> Areas => Set<Area>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<ContractType> ContractTypes => Set<ContractType>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<VacationRequest> VacationRequests => Set<VacationRequest>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<PayrollRecord> PayrollRecords => Set<PayrollRecord>();
    public DbSet<RecruitmentCandidate> RecruitmentCandidates => Set<RecruitmentCandidate>();
    public DbSet<GeneralSetting> GeneralSettings => Set<GeneralSetting>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<AttendanceIncident> AttendanceIncidents => Set<AttendanceIncident>();
    public DbSet<PayrollConcept> PayrollConcepts => Set<PayrollConcept>();
    public DbSet<PayrollLoan> PayrollLoans => Set<PayrollLoan>();
    public DbSet<PayrollLoanInstallment> PayrollLoanInstallments => Set<PayrollLoanInstallment>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<EmployeeChangeLog> EmployeeChangeLogs => Set<EmployeeChangeLog>();
    public DbSet<JobPosting> JobPostings => Set<JobPosting>();
    public DbSet<CandidateStatusHistory> CandidateStatusHistory => Set<CandidateStatusHistory>();
    public DbSet<AppNotification> AppNotifications => Set<AppNotification>();
    public DbSet<OnboardingTemplate> OnboardingTemplates => Set<OnboardingTemplate>();
    public DbSet<OnboardingTemplateTask> OnboardingTemplateTasks => Set<OnboardingTemplateTask>();
    public DbSet<OnboardingProcess> OnboardingProcesses => Set<OnboardingProcess>();
    public DbSet<OnboardingTask> OnboardingTasks => Set<OnboardingTask>();
    public DbSet<EvaluationCycle> EvaluationCycles => Set<EvaluationCycle>();
    public DbSet<EvaluationAssignment> EvaluationAssignments => Set<EvaluationAssignment>();
    public DbSet<DocumentTemplate> DocumentTemplates => Set<DocumentTemplate>();
    public DbSet<EmployeeDocument> EmployeeDocuments => Set<EmployeeDocument>();
    public DbSet<ApiToken> ApiTokens => Set<ApiToken>();
    public DbSet<WebhookEndpoint> WebhookEndpoints => Set<WebhookEndpoint>();
    public DbSet<WebhookDelivery> WebhookDeliveries => Set<WebhookDelivery>();
    public DbSet<CalendarFeedToken> CalendarFeedTokens => Set<CalendarFeedToken>();
    public DbSet<CalendarConnection> CalendarConnections => Set<CalendarConnection>();
    public DbSet<CalendarSyncEvent> CalendarSyncEvents => Set<CalendarSyncEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HrmsDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
