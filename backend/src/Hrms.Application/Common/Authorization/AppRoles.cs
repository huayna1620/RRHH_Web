namespace Hrms.Application.Common.Authorization;

public static class AppRoles
{
    public const string SuperAdmin = "SUPER_ADMIN";
    public const string HrManager = "HR_MANAGER";
    public const string Employee = "EMPLOYEE";

    public static readonly IReadOnlyList<string> DefaultRoles =
    [
        SuperAdmin,
        HrManager,
        Employee
    ];
}
