using Hrms.Application.Common.Authorization;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Persistence.Seed;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(HrmsDbContext dbContext, CancellationToken cancellationToken = default)
    {
        await SeedPermissionsAsync(dbContext, cancellationToken);
        await SeedRolesAndAssignmentsAsync(dbContext, cancellationToken);
        await SeedAdminUserAsync(dbContext, cancellationToken);
        await SeedCatalogsAsync(dbContext, cancellationToken);
        await SeedGeneralSettingsAsync(dbContext, cancellationToken);
        await SeedHolidaysAsync(dbContext, cancellationToken);
        await SeedSampleEmployeesAsync(dbContext, cancellationToken);
        await LinkAdminToFirstEmployeeAsync(dbContext, cancellationToken);
    }

    private static async Task LinkAdminToFirstEmployeeAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        // Link the admin user to the first sample employee so "Mi Portal" works out of the box.
        var admin = await dbContext.Users
            .FirstOrDefaultAsync(u => u.NormalizedUserName == "ADMIN", cancellationToken);
        if (admin is null || admin.EmployeeId is not null) return;

        var firstEmployee = await dbContext.Employees
            .Where(e => !e.IsDeleted)
            .OrderBy(e => e.EmployeeCode)
            .Select(e => new { e.Id })
            .FirstOrDefaultAsync(cancellationToken);
        if (firstEmployee is null) return;

        admin.EmployeeId = firstEmployee.Id;
        admin.UpdatedAtUtc = DateTime.UtcNow;
        admin.UpdatedBy = "seed";
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedPermissionsAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        var existingCodes = await dbContext.Permissions
            .AsNoTracking()
            .Select(x => x.Code)
            .ToListAsync(cancellationToken);

        var existingCodeSet = existingCodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;

        var missingPermissions = AppPermissions.All
            .Where(code => !existingCodeSet.Contains(code))
            .Select(code => new Permission
            {
                Code = code,
                Name = code.Replace('.', ' ').ToUpperInvariant(),
                Module = code.Split('.')[0],
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                CreatedBy = "seed",
                UpdatedBy = "seed"
            })
            .ToList();

        if (missingPermissions.Count == 0)
        {
            return;
        }

        await dbContext.Permissions.AddRangeAsync(missingPermissions, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedRolesAndAssignmentsAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var rolesByName = await dbContext.Roles
            .ToDictionaryAsync(x => x.NormalizedName, cancellationToken);

        foreach (var roleName in AppRoles.DefaultRoles)
        {
            if (rolesByName.ContainsKey(roleName))
            {
                continue;
            }

            var role = new Role
            {
                Name = roleName,
                NormalizedName = roleName.ToUpperInvariant(),
                Description = roleName switch
                {
                    AppRoles.SuperAdmin => "Acceso total al sistema",
                    AppRoles.HrManager => "Gestión operativa de RRHH",
                    _ => "Acceso de colaborador"
                },
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                CreatedBy = "seed",
                UpdatedBy = "seed"
            };

            await dbContext.Roles.AddAsync(role, cancellationToken);
            rolesByName[role.NormalizedName] = role;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var permissions = await dbContext.Permissions
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (!rolesByName.TryGetValue(AppRoles.SuperAdmin, out var superAdminRole) ||
            !rolesByName.TryGetValue(AppRoles.HrManager, out var hrManagerRole))
        {
            return;
        }

        var existingRolePermissions = await dbContext.RolePermissions
            .AsNoTracking()
            .Select(x => new { x.RoleId, x.PermissionId })
            .ToListAsync(cancellationToken);

        var existingSet = existingRolePermissions
            .Select(x => (x.RoleId, x.PermissionId))
            .ToHashSet();

        var pendingRolePermissions = new List<RolePermission>();

        foreach (var permission in permissions)
        {
            if (existingSet.Add((superAdminRole.Id, permission.Id)))
            {
                pendingRolePermissions.Add(new RolePermission
                {
                    RoleId = superAdminRole.Id,
                    PermissionId = permission.Id
                });
            }
        }

        var hrManagerPermissionCodes = new[]
        {
            AppPermissions.DashboardView,
            AppPermissions.EmployeesView,
            AppPermissions.EmployeesCreate,
            AppPermissions.EmployeesEdit,
            AppPermissions.EmployeesDelete,
            AppPermissions.AreasView,
            AppPermissions.AreasCreate,
            AppPermissions.AreasEdit,
            AppPermissions.PositionsView,
            AppPermissions.PositionsCreate,
            AppPermissions.PositionsEdit,
            AppPermissions.AttendanceView,
            AppPermissions.AttendanceCreate,
            AppPermissions.AttendanceEdit,
            AppPermissions.AttendanceJustify,
            AppPermissions.AttendanceIncidentsView,
            AppPermissions.AttendanceIncidentsJustify,
            AppPermissions.AttendanceIncidentsApprove,
            AppPermissions.PayrollApprove,
            AppPermissions.PayrollConceptsView,
            AppPermissions.PayrollConceptsEdit,
            AppPermissions.PayrollLoansView,
            AppPermissions.PayrollLoansCreate,
            AppPermissions.PayrollLoansEdit,
            AppPermissions.VacationsView,
            AppPermissions.VacationsCreate,
            AppPermissions.VacationsApprove,
            AppPermissions.LeavesView,
            AppPermissions.LeavesCreate,
            AppPermissions.LeavesApprove,
            AppPermissions.PayrollView,
            AppPermissions.PayrollCreate,
            AppPermissions.PayrollEdit,
            AppPermissions.RecruitmentView,
            AppPermissions.RecruitmentCreate,
            AppPermissions.RecruitmentEdit,
            AppPermissions.RecruitmentDelete,
            AppPermissions.ReportsView,
            AppPermissions.ConfigurationView,
            AppPermissions.ConfigurationCreate,
            AppPermissions.ConfigurationEdit,
            AppPermissions.ConfigurationDelete,
            AppPermissions.UsersView,
            AppPermissions.RolesView,
            AppPermissions.OnboardingView,
            AppPermissions.OnboardingCreate,
            AppPermissions.OnboardingEdit,
            AppPermissions.EvaluationsView,
            AppPermissions.EvaluationsCreate,
            AppPermissions.EvaluationsEdit,
            AppPermissions.DocumentsView,
            AppPermissions.DocumentsCreate,
            AppPermissions.DocumentsEdit,
            AppPermissions.AnalyticsView,
            AppPermissions.IntegrationsManage
        };

        foreach (var permission in permissions.Where(x => hrManagerPermissionCodes.Contains(x.Code, StringComparer.OrdinalIgnoreCase)))
        {
            if (existingSet.Add((hrManagerRole.Id, permission.Id)))
            {
                pendingRolePermissions.Add(new RolePermission
                {
                    RoleId = hrManagerRole.Id,
                    PermissionId = permission.Id
                });
            }
        }

        if (pendingRolePermissions.Count == 0)
        {
            return;
        }

        await dbContext.RolePermissions.AddRangeAsync(pendingRolePermissions, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedGeneralSettingsAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        await EnsureGeneralSettingAsync("company.name", "Empresa Demo SAC", "Nombre de la empresa", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("company.ruc", "20123456789", "RUC principal", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("company.timezone", "America/Lima", "Zona horaria operativa", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("payroll.currency", "PEN", "Moneda base de planilla", false, dbContext, now, cancellationToken);

        // Phase 2: vacation and leave settings
        await EnsureGeneralSettingAsync("vacation.annual_days", "30", "Dias de vacaciones anuales por empleado", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("leave.personal.max_days", "15", "Maximo dias de permiso personal por ano", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("leave.medical.max_days", "60", "Maximo dias de licencia medica por ano", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("leave.study.max_days", "30", "Maximo dias de licencia por estudios por ano", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("leave.maternity_paternity.max_days", "98", "Maximo dias de licencia maternidad/paternidad por ano", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("leave.other.max_days", "10", "Maximo dias de otros permisos por ano", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("work.schedule.start", "08:00", "Hora de inicio de jornada laboral", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("work.schedule.end", "18:00", "Hora de fin de jornada laboral", false, dbContext, now, cancellationToken);

        // Phase 3: payroll calculation settings
        await EnsureGeneralSettingAsync("payroll.daily_divisor", "30", "Divisor para calcular jornal diario (BaseSalary / divisor)", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("payroll.work_hours_per_day", "8", "Horas de trabajo por dia para calcular descuento por minuto", false, dbContext, now, cancellationToken);

        // Phase 2C: attendance incident settings
        await EnsureGeneralSettingAsync("attendance.late_tolerance_minutes", "5", "Minutos de tolerancia para tardanza", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("attendance.early_leave_minutes", "10", "Minutos minimos para generar incidencia de salida anticipada", false, dbContext, now, cancellationToken);
        await EnsureGeneralSettingAsync("attendance.justification_days", "3", "Dias habiles para presentar justificacion de incidencia", false, dbContext, now, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedAdminUserAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        var adminUserName = "admin";
        var normalized = adminUserName.ToUpperInvariant();

        var existingAdmin = await dbContext.Users
            .Include(x => x.UserRoles)
            .FirstOrDefaultAsync(x => x.NormalizedUserName == normalized, cancellationToken);

        if (existingAdmin is null)
        {
            var superAdminRole = await dbContext.Roles.FirstOrDefaultAsync(
                x => x.NormalizedName == AppRoles.SuperAdmin,
                cancellationToken);

            if (superAdminRole is null)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var user = new User
            {
                UserName = adminUserName,
                NormalizedUserName = normalized,
                Email = "admin@hrms.local",
                NormalizedEmail = "ADMIN@HRMS.LOCAL",
                FullName = "System Administrator",
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                CreatedBy = "seed",
                UpdatedBy = "seed"
            };

            var passwordHasher = new PasswordHasher<User>();
            user.PasswordHash = passwordHasher.HashPassword(user, "Admin123!");

            await dbContext.Users.AddAsync(user, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);

            await dbContext.UserRoles.AddAsync(new UserRole
            {
                UserId = user.Id,
                RoleId = superAdminRole.Id
            }, cancellationToken);

            await dbContext.SaveChangesAsync(cancellationToken);
            return;
        }

        var roleId = await dbContext.Roles
            .Where(x => x.NormalizedName == AppRoles.SuperAdmin)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (roleId == Guid.Empty)
        {
            return;
        }

        var hasRole = existingAdmin.UserRoles.Any(x => x.RoleId == roleId);
        if (hasRole)
        {
            return;
        }

        await dbContext.UserRoles.AddAsync(new UserRole
        {
            UserId = existingAdmin.Id,
            RoleId = roleId
        }, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedCatalogsAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        await EnsureBranchAsync("HQ", "Sede Principal", dbContext, now, cancellationToken);
        await EnsureBranchAsync("LIM-N", "Sede Lima Norte", dbContext, now, cancellationToken);

        await EnsureAreaAsync("RRHH", "Recursos Humanos", dbContext, now, cancellationToken);
        await EnsureAreaAsync("FIN", "Finanzas", dbContext, now, cancellationToken);
        await EnsureAreaAsync("TI", "Tecnología", dbContext, now, cancellationToken);

        await EnsurePositionAsync("ANL", "Analista", dbContext, now, cancellationToken);
        await EnsurePositionAsync("COOR", "Coordinador", dbContext, now, cancellationToken);
        await EnsurePositionAsync("JEF", "Jefe", dbContext, now, cancellationToken);

        await EnsureContractTypeAsync("IND", "Indeterminado", dbContext, now, cancellationToken);
        await EnsureContractTypeAsync("PLZ", "Plazo Fijo", dbContext, now, cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedHolidaysAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.Holidays.AnyAsync(x => !x.IsDeleted, cancellationToken))
        {
            return;
        }

        var now = DateTime.UtcNow;

        // Feriados oficiales de Peru (recurrentes)
        Holiday[] holidays =
        [
            new() { Date = new DateOnly(2024, 1, 1), Name = "Ano Nuevo", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 5, 1), Name = "Dia del Trabajo", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 6, 29), Name = "San Pedro y San Pablo", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 7, 28), Name = "Fiestas Patrias", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 7, 29), Name = "Fiestas Patrias (2do dia)", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 8, 30), Name = "Santa Rosa de Lima", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 10, 8), Name = "Combate de Angamos", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 11, 1), Name = "Dia de Todos los Santos", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 12, 8), Name = "Inmaculada Concepcion", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 12, 9), Name = "Batalla de Ayacucho", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" },
            new() { Date = new DateOnly(2024, 12, 25), Name = "Navidad", IsRecurring = true, CreatedAtUtc = now, UpdatedAtUtc = now, CreatedBy = "seed", UpdatedBy = "seed" }
        ];

        await dbContext.Holidays.AddRangeAsync(holidays, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task SeedSampleEmployeesAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.Employees.AnyAsync(x => !x.IsDeleted, cancellationToken))
        {
            return;
        }

        var branchId = await dbContext.Branches.Where(x => x.Code == "HQ").Select(x => x.Id).FirstAsync(cancellationToken);
        var areaHrId = await dbContext.Areas.Where(x => x.Code == "RRHH").Select(x => x.Id).FirstAsync(cancellationToken);
        var areaTiId = await dbContext.Areas.Where(x => x.Code == "TI").Select(x => x.Id).FirstAsync(cancellationToken);
        var positionJefId = await dbContext.Positions.Where(x => x.Code == "JEF").Select(x => x.Id).FirstAsync(cancellationToken);
        var positionAnlId = await dbContext.Positions.Where(x => x.Code == "ANL").Select(x => x.Id).FirstAsync(cancellationToken);
        var contractTypeId = await dbContext.ContractTypes.Where(x => x.Code == "IND").Select(x => x.Id).FirstAsync(cancellationToken);

        var now = DateTime.UtcNow;

        var manager = new Employee
        {
            EmployeeCode = "EMP-0001",
            FirstName = "María",
            LastName = "Vargas",
            DocumentType = "DNI",
            DocumentNumber = "40112233",
            BirthDate = new DateOnly(1987, 5, 11),
            HireDate = new DateOnly(2021, 1, 4),
            BaseSalary = 7200,
            PersonalEmail = "maria.vargas.personal@mail.com",
            WorkEmail = "maria.vargas@empresa.com",
            PhoneNumber = "999888777",
            BranchId = branchId,
            AreaId = areaHrId,
            PositionId = positionJefId,
            ContractTypeId = contractTypeId,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        };

        await dbContext.Employees.AddAsync(manager, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var analyst = new Employee
        {
            EmployeeCode = "EMP-0002",
            FirstName = "Diego",
            LastName = "Ramos",
            DocumentType = "DNI",
            DocumentNumber = "45554433",
            BirthDate = new DateOnly(1995, 2, 22),
            HireDate = new DateOnly(2023, 8, 14),
            BaseSalary = 3500,
            PersonalEmail = "diego.ramos.personal@mail.com",
            WorkEmail = "diego.ramos@empresa.com",
            PhoneNumber = "988777666",
            BranchId = branchId,
            AreaId = areaTiId,
            PositionId = positionAnlId,
            ContractTypeId = contractTypeId,
            ManagerId = manager.Id,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        };

        await dbContext.Employees.AddAsync(analyst, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task EnsureBranchAsync(string code, string name, HrmsDbContext dbContext, DateTime now, CancellationToken cancellationToken)
    {
        if (await dbContext.Branches.AnyAsync(x => x.Code == code, cancellationToken))
        {
            return;
        }

        await dbContext.Branches.AddAsync(new Branch
        {
            Code = code,
            Name = name,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        }, cancellationToken);
    }

    private static async Task EnsureAreaAsync(string code, string name, HrmsDbContext dbContext, DateTime now, CancellationToken cancellationToken)
    {
        if (await dbContext.Areas.AnyAsync(x => x.Code == code, cancellationToken))
        {
            return;
        }

        await dbContext.Areas.AddAsync(new Area
        {
            Code = code,
            Name = name,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        }, cancellationToken);
    }

    private static async Task EnsurePositionAsync(string code, string name, HrmsDbContext dbContext, DateTime now, CancellationToken cancellationToken)
    {
        if (await dbContext.Positions.AnyAsync(x => x.Code == code, cancellationToken))
        {
            return;
        }

        await dbContext.Positions.AddAsync(new Position
        {
            Code = code,
            Name = name,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        }, cancellationToken);
    }

    private static async Task EnsureContractTypeAsync(string code, string name, HrmsDbContext dbContext, DateTime now, CancellationToken cancellationToken)
    {
        if (await dbContext.ContractTypes.AnyAsync(x => x.Code == code, cancellationToken))
        {
            return;
        }

        await dbContext.ContractTypes.AddAsync(new ContractType
        {
            Code = code,
            Name = name,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        }, cancellationToken);
    }

    private static async Task EnsureGeneralSettingAsync(
        string key,
        string value,
        string description,
        bool isSensitive,
        HrmsDbContext dbContext,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (await dbContext.GeneralSettings.AnyAsync(x => x.Key == key && !x.IsDeleted, cancellationToken))
        {
            return;
        }

        await dbContext.GeneralSettings.AddAsync(new GeneralSetting
        {
            Key = key,
            Value = value,
            Description = description,
            IsSensitive = isSensitive,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            CreatedBy = "seed",
            UpdatedBy = "seed"
        }, cancellationToken);
    }
}


