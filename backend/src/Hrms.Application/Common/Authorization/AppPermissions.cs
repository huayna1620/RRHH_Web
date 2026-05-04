namespace Hrms.Application.Common.Authorization;

public static class AppPermissions
{
    public const string DashboardView = "dashboard.view";
    public const string UsersView = "users.view";
    public const string UsersCreate = "users.create";
    public const string UsersEdit = "users.edit";
    public const string RolesView = "roles.view";
    public const string RolesEdit = "roles.edit";
    public const string EmployeesView = "employees.view";
    public const string EmployeesCreate = "employees.create";
    public const string EmployeesEdit = "employees.edit";
    public const string EmployeesDelete = "employees.delete";
    public const string AreasView = "areas.view";
    public const string AreasCreate = "areas.create";
    public const string AreasEdit = "areas.edit";
    public const string AreasDelete = "areas.delete";
    public const string PositionsView = "positions.view";
    public const string PositionsCreate = "positions.create";
    public const string PositionsEdit = "positions.edit";
    public const string PositionsDelete = "positions.delete";
    public const string AttendanceView = "attendance.view";
    public const string AttendanceCreate = "attendance.create";
    public const string AttendanceEdit = "attendance.edit";
    public const string AttendanceJustify = "attendance.justify";
    public const string VacationsView = "vacations.view";
    public const string VacationsCreate = "vacations.create";
    public const string VacationsApprove = "vacations.approve";
    public const string LeavesView = "leaves.view";
    public const string LeavesCreate = "leaves.create";
    public const string LeavesApprove = "leaves.approve";
    public const string PayrollView = "payroll.view";
    public const string PayrollCreate = "payroll.create";
    public const string PayrollEdit = "payroll.edit";
    public const string RecruitmentView = "recruitment.view";
    public const string RecruitmentCreate = "recruitment.create";
    public const string RecruitmentEdit = "recruitment.edit";
    public const string RecruitmentDelete = "recruitment.delete";
    public const string ReportsView = "reports.view";
    public const string ConfigurationView = "configuration.view";
    public const string ConfigurationCreate = "configuration.create";
    public const string ConfigurationEdit = "configuration.edit";
    public const string ConfigurationDelete = "configuration.delete";
    public const string AuditLogView = "auditlog.view";
    public const string HolidaysView = "holidays.view";
    public const string HolidaysEdit = "holidays.edit";
    public const string AttendanceIncidentsView = "attendance.incidents.view";
    public const string AttendanceIncidentsJustify = "attendance.incidents.justify";
    public const string AttendanceIncidentsApprove = "attendance.incidents.approve";
    public const string PayrollApprove = "payroll.approve";
    public const string PayrollConceptsView = "payroll.concepts.view";
    public const string PayrollConceptsEdit = "payroll.concepts.edit";
    public const string PayrollLoansView = "payroll.loans.view";
    public const string PayrollLoansCreate = "payroll.loans.create";
    public const string PayrollLoansEdit = "payroll.loans.edit";
    public const string JobPostingsView = "jobpostings.view";
    public const string JobPostingsCreate = "jobpostings.create";
    public const string JobPostingsEdit = "jobpostings.edit";
    public const string OnboardingView = "onboarding.view";
    public const string OnboardingCreate = "onboarding.create";
    public const string OnboardingEdit = "onboarding.edit";
    public const string EvaluationsView = "evaluations.view";
    public const string EvaluationsCreate = "evaluations.create";
    public const string EvaluationsEdit = "evaluations.edit";
    public const string DocumentsView = "documents.view";
    public const string DocumentsCreate = "documents.create";
    public const string DocumentsEdit = "documents.edit";
    public const string AnalyticsView = "analytics.view";
    public const string IntegrationsManage = "integrations.manage";

    public static readonly IReadOnlyList<string> All =
    [
        DashboardView,
        UsersView,
        UsersCreate,
        UsersEdit,
        RolesView,
        RolesEdit,
        EmployeesView,
        EmployeesCreate,
        EmployeesEdit,
        EmployeesDelete,
        AreasView,
        AreasCreate,
        AreasEdit,
        AreasDelete,
        PositionsView,
        PositionsCreate,
        PositionsEdit,
        PositionsDelete,
        AttendanceView,
        AttendanceCreate,
        AttendanceEdit,
        AttendanceJustify,
        VacationsView,
        VacationsCreate,
        VacationsApprove,
        LeavesView,
        LeavesCreate,
        LeavesApprove,
        PayrollView,
        PayrollCreate,
        PayrollEdit,
        RecruitmentView,
        RecruitmentCreate,
        RecruitmentEdit,
        RecruitmentDelete,
        ReportsView,
        ConfigurationView,
        ConfigurationCreate,
        ConfigurationEdit,
        ConfigurationDelete,
        AuditLogView,
        HolidaysView,
        HolidaysEdit,
        AttendanceIncidentsView,
        AttendanceIncidentsJustify,
        AttendanceIncidentsApprove,
        PayrollApprove,
        PayrollConceptsView,
        PayrollConceptsEdit,
        PayrollLoansView,
        PayrollLoansCreate,
        PayrollLoansEdit,
        JobPostingsView,
        JobPostingsCreate,
        JobPostingsEdit,
        OnboardingView,
        OnboardingCreate,
        OnboardingEdit,
        EvaluationsView,
        EvaluationsCreate,
        EvaluationsEdit,
        DocumentsView,
        DocumentsCreate,
        DocumentsEdit,
        AnalyticsView,
        IntegrationsManage
    ];
}

