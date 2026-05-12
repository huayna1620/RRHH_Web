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
        await SeedDocumentTemplatesAsync(dbContext, cancellationToken);
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

    private static async Task SeedDocumentTemplatesAsync(HrmsDbContext dbContext, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var templates = new[]
        {
            new
            {
                Name = "Contrato de trabajo indefinido",
                Type = "Contrato",
                Category = "Contratos",
                Description = "Contrato a tiempo indefinido para personal en planilla.",
                RequiresEmployeeSignature = true,
                RequiresHrSignature = true,
                Html = """
                <h2 style="text-align:center">CONTRATO DE TRABAJO INDEFINIDO</h2>
                <p>En Lima, a {{FECHA_ACTUAL}}, la empresa <strong>{{EMPRESA}}</strong> celebra el presente contrato con:</p>
                <p><strong>Colaborador:</strong> {{NOMBRE_COMPLETO}}<br>
                <strong>DNI / CE:</strong> {{DNI}}<br>
                <strong>Código:</strong> {{CODIGO_EMPLEADO}}<br>
                <strong>Cargo:</strong> {{CARGO}}<br>
                <strong>Área:</strong> {{AREA}}<br>
                <strong>Sede:</strong> {{SEDE}}<br>
                <strong>Fecha de ingreso:</strong> {{FECHA_INGRESO}}<br>
                <strong>Remuneración:</strong> S/ {{SUELDO}}</p>
                <p>El colaborador prestará servicios conforme a las políticas internas, reglamento y lineamientos de la empresa.</p>
                <br>
                <table style="width:100%;margin-top:32px"><tr>
                <td style="text-align:center;width:50%">___________________________<br><strong>{{NOMBRE_COMPLETO}}</strong><br>DNI: {{DNI}}</td>
                <td style="text-align:center;width:50%">___________________________<br><strong>Recursos Humanos</strong><br>{{EMPRESA}}</td>
                </tr></table>
                """
            },
            new
            {
                Name = "Constancia de trabajo",
                Type = "Constancia",
                Category = "Documentos laborales",
                Description = "Certificación de la relación laboral activa del colaborador.",
                RequiresEmployeeSignature = false,
                RequiresHrSignature = true,
                Html = """
                <h2 style="text-align:center">CONSTANCIA DE TRABAJO</h2>
                <p>Por medio de la presente, <strong>{{EMPRESA}}</strong> deja constancia que:</p>
                <p><strong>{{NOMBRE_COMPLETO}}</strong>, identificado(a) con DNI / CE <strong>{{DNI}}</strong>, labora en la empresa desde el <strong>{{FECHA_INGRESO}}</strong>, desempeñando el cargo de <strong>{{CARGO}}</strong> en el área de <strong>{{AREA}}</strong>, sede <strong>{{SEDE}}</strong>.</p>
                <p>Se expide la presente a solicitud del interesado para los fines que estime convenientes.</p>
                <p>Lima, {{FECHA_ACTUAL}}</p>
                <br><p style="text-align:center">___________________________<br><strong>Recursos Humanos</strong><br>{{EMPRESA}}</p>
                """
            },
            new
            {
                Name = "Política de confidencialidad",
                Type = "Política",
                Category = "Políticas y cumplimiento",
                Description = "Compromiso de no divulgar información sensible de la empresa.",
                RequiresEmployeeSignature = true,
                RequiresHrSignature = false,
                Html = """
                <h2 style="text-align:center">ACUERDO DE CONFIDENCIALIDAD</h2>
                <p>Yo, <strong>{{NOMBRE_COMPLETO}}</strong>, identificado(a) con DNI / CE <strong>{{DNI}}</strong>, en mi calidad de <strong>{{CARGO}}</strong> del área <strong>{{AREA}}</strong>, declaro conocer y aceptar la política de confidencialidad de <strong>{{EMPRESA}}</strong>.</p>
                <p>Me comprometo a proteger la información sensible, técnica, comercial, laboral y administrativa a la que tenga acceso durante mi relación con la empresa.</p>
                <p>Fecha de aceptación: {{FECHA_ACTUAL}}</p>
                <br><p style="text-align:center">___________________________<br><strong>{{NOMBRE_COMPLETO}}</strong><br>DNI: {{DNI}}</p>
                """
            },
            new
            {
                Name = "Entrega y recepción de equipos",
                Type = "Acta",
                Category = "Anexos y autorizaciones",
                Description = "Registro de equipos, credenciales y activos asignados al colaborador.",
                RequiresEmployeeSignature = true,
                RequiresHrSignature = true,
                Html = """
                <h2 style="text-align:center">ACTA DE ENTREGA Y RECEPCIÓN DE EQUIPOS</h2>
                <p>En la fecha {{FECHA_ACTUAL}}, <strong>{{EMPRESA}}</strong> entrega al colaborador <strong>{{NOMBRE_COMPLETO}}</strong>, DNI / CE <strong>{{DNI}}</strong>, del cargo <strong>{{CARGO}}</strong>, los siguientes activos:</p>
                <p><strong>Equipo asignado:</strong> {{EQUIPO_ASIGNADO}}<br>
                <strong>Número de serie:</strong> {{NUMERO_SERIE}}<br>
                <strong>Observaciones:</strong> {{OBSERVACIONES}}</p>
                <p>El colaborador declara recibir los bienes en buen estado y se compromete a su uso responsable.</p>
                <br><table style="width:100%;margin-top:32px"><tr>
                <td style="text-align:center;width:50%">___________________________<br><strong>{{NOMBRE_COMPLETO}}</strong></td>
                <td style="text-align:center;width:50%">___________________________<br><strong>Recursos Humanos</strong></td>
                </tr></table>
                """
            }
        };

        var existingTemplates = await dbContext.DocumentTemplates
            .Where(x => !x.IsDeleted)
            .ToListAsync(cancellationToken);
        var existingNames = existingTemplates
            .Select(x => x.Name)
            .ToList();
        var existing = existingNames.ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var item in templates)
        {
            var current = existingTemplates.FirstOrDefault(x => string.Equals(x.Name, item.Name, StringComparison.OrdinalIgnoreCase));
            if (current is null || !string.Equals(current.CreatedBy, "seed", StringComparison.OrdinalIgnoreCase)) continue;

            var html = BuildGenericDocumentTemplateHtml(item.Name, item.Category, item.Description);
            current.Type = item.Type;
            current.Category = item.Category;
            current.Description = item.Description;
            current.HtmlContent = html;
            current.VariablesJson = System.Text.Json.JsonSerializer.Serialize(DetectTemplateVariables(html));
            current.RequiresEmployeeSignature = item.RequiresEmployeeSignature;
            current.RequiresHrSignature = item.RequiresHrSignature;
            current.Format = "html";
            current.UpdatedAtUtc = now;
            current.UpdatedBy = "seed";
        }

        var pending = templates
            .Where(x => !existing.Contains(x.Name))
            .Select(x =>
            {
                var html = BuildGenericDocumentTemplateHtml(x.Name, x.Category, x.Description);
                return new DocumentTemplate
                {
                    Name = x.Name,
                    Type = x.Type,
                    Category = x.Category,
                    Description = x.Description,
                    HtmlContent = html,
                    VariablesJson = System.Text.Json.JsonSerializer.Serialize(DetectTemplateVariables(html)),
                    RequiresEmployeeSignature = x.RequiresEmployeeSignature,
                    RequiresHrSignature = x.RequiresHrSignature,
                    Format = "html",
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now,
                    CreatedBy = "seed",
                    UpdatedBy = "seed"
                };
            })
            .ToList();

        var extraTemplates = new[]
        {
            ("Contrato de trabajo temporal", "Contrato", "Contratos", "Contrato laboral con fecha de término definida.", true, true),
            ("Contrato por locación de servicios", "Contrato", "Contratos", "Para prestadores de servicios independientes y consultores.", true, true),
            ("Contrato de prácticas preprofesionales", "Contrato", "Contratos", "Para practicantes en proceso de formación universitaria.", true, true),
            ("Contrato de prácticas profesionales", "Contrato", "Contratos", "Para practicantes con carrera técnica o universitaria concluida.", true, true),
            ("Adenda de contrato", "Contrato", "Contratos", "Modificación formal a las condiciones de un contrato vigente.", true, true),
            ("Renovación de contrato", "Contrato", "Contratos", "Prórroga o renovación de un contrato con nuevas condiciones.", true, true),
            ("Compromiso de protección de datos", "Política", "Políticas y cumplimiento", "Consentimiento de tratamiento de datos personales del colaborador.", true, false),
            ("Política de uso de equipos", "Política", "Políticas y cumplimiento", "Normas para el uso correcto de equipos asignados por la empresa.", true, false),
            ("Política de seguridad de la información", "Política", "Políticas y cumplimiento", "Lineamientos de ciberseguridad y manejo de información digital.", true, false),
            ("Declaración de conflicto de interés", "Declaración", "Políticas y cumplimiento", "Declaración jurada sobre ausencia de conflictos de interés.", true, false),
            ("Recepción de reglamento interno", "Acuse", "Políticas y cumplimiento", "Constancia de recepción del reglamento interno de trabajo.", true, false),
            ("Código de ética y conducta", "Política", "Políticas y cumplimiento", "Compromisos de conducta ética y profesional del trabajador.", true, false),
            ("Carta de nombramiento", "Carta", "Documentos laborales", "Comunicación oficial de designación a un nuevo cargo o función.", false, true),
            ("Carta de ascenso", "Carta", "Documentos laborales", "Comunicación formal de promoción de cargo con nuevo nivel salarial.", false, true),
            ("Carta de cambio de sede", "Carta", "Documentos laborales", "Notificación formal de cambio de lugar de trabajo del colaborador.", false, true),
            ("Carta de cambio de cargo", "Carta", "Documentos laborales", "Comunicación de reasignación de funciones dentro de la empresa.", false, true),
            ("Carta de vacaciones aprobadas", "Carta", "Documentos laborales", "Autorización formal del periodo vacacional del colaborador.", false, true),
            ("Carta de amonestación", "Carta", "Documentos laborales", "Comunicación formal de sanción disciplinaria con detalle de la falta.", true, true),
            ("Carta de felicitación", "Carta", "Documentos laborales", "Reconocimiento formal al colaborador por logros destacados.", false, true),
            ("Certificado laboral", "Certificado", "Documentos laborales", "Certificación detallada del cargo, funciones y periodo laborado.", false, true),
            ("Anexo de beneficios", "Anexo", "Anexos y autorizaciones", "Detalle de los beneficios contractuales y extralegales del colaborador.", true, true),
            ("Anexo salarial", "Anexo", "Anexos y autorizaciones", "Estructura detallada de la remuneración mensual acordada.", true, true),
            ("Acuerdo de teletrabajo", "Acuerdo", "Anexos y autorizaciones", "Términos y condiciones para el trabajo remoto o modalidad híbrida.", true, true),
            ("Permiso de uso de imagen", "Autorización", "Anexos y autorizaciones", "Autorización del colaborador para uso de su imagen en comunicaciones.", true, false),
            ("Autorización de descuento por planilla", "Autorización", "Anexos y autorizaciones", "Consentimiento para aplicar descuentos o retenciones en planilla.", true, false),
            ("Consentimiento de firma digital", "Autorización", "Anexos y autorizaciones", "Aceptación del uso de firma electrónica en documentos laborales.", true, false),
            ("Evaluación de desempeño", "Evaluación", "Evaluación y talento", "Formulario de evaluación de resultados y competencias del periodo.", true, true),
            ("Acta de retroalimentación", "Evaluación", "Evaluación y talento", "Registro del proceso de feedback entre líder y colaborador.", true, false),
            ("Carta de objetivos del periodo", "Carta", "Evaluación y talento", "Compromisos de desempeño y metas acordadas para el nuevo periodo.", true, true),
            ("Plan de mejora individual", "Plan", "Evaluación y talento", "Acompañamiento para colaboradores en proceso de mejora continua.", true, true),
            ("Registro de capacitación", "Registro", "Salud y seguridad", "Constancia de participación en programa de formación o capacitación.", true, false),
            ("Compromiso de seguridad y salud", "Compromiso", "Salud y seguridad", "Declaración de compromisos en seguridad y salud en el trabajo.", true, false),
            ("Declaración médica ocupacional", "Declaración", "Salud y seguridad", "Declaración del estado de salud general para aptitud al puesto.", true, false),
            ("Constancia de inducción", "Constancia", "Salud y seguridad", "Acreditación de la inducción corporativa al nuevo colaborador.", true, false)
        };

        foreach (var item in extraTemplates)
        {
            var html = BuildGenericDocumentTemplateHtml(item.Item1, item.Item3, item.Item4);
            var current = existingTemplates.FirstOrDefault(x => string.Equals(x.Name, item.Item1, StringComparison.OrdinalIgnoreCase));
            if (current is not null)
            {
                if (!string.Equals(current.CreatedBy, "seed", StringComparison.OrdinalIgnoreCase)) continue;

                current.Type = item.Item2;
                current.Category = item.Item3;
                current.Description = item.Item4;
                current.HtmlContent = html;
                current.VariablesJson = System.Text.Json.JsonSerializer.Serialize(DetectTemplateVariables(html));
                current.RequiresEmployeeSignature = item.Item5;
                current.RequiresHrSignature = item.Item6;
                current.Format = "html";
                current.UpdatedAtUtc = now;
                current.UpdatedBy = "seed";
                continue;
            }

            pending.Add(new DocumentTemplate
            {
                Name = item.Item1,
                Type = item.Item2,
                Category = item.Item3,
                Description = item.Item4,
                HtmlContent = html,
                VariablesJson = System.Text.Json.JsonSerializer.Serialize(DetectTemplateVariables(html)),
                RequiresEmployeeSignature = item.Item5,
                RequiresHrSignature = item.Item6,
                Format = "html",
                CreatedAtUtc = now,
                UpdatedAtUtc = now,
                CreatedBy = "seed",
                UpdatedBy = "seed"
            });
        }

        if (pending.Count > 0)
        {
            await dbContext.DocumentTemplates.AddRangeAsync(pending, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static IReadOnlyList<string> DetectTemplateVariables(string html)
    {
        return System.Text.RegularExpressions.Regex.Matches(html, @"\{\{\s*([^{}]+?)\s*\}\}")
            .Select(match => match.Groups[1].Value.Trim())
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value)
            .ToList();
    }

    private static string BuildGenericDocumentTemplateHtml(string name, string category, string description)
    {
        return $@"
        <h2>{name.ToUpperInvariant()}</h2>
        <p class=""letter-date"">Lima, {{{{FECHA_ACTUAL}}}}</p>
        <p>Señor(a):<br>
        <strong>{{{{NOMBRE_COMPLETO}}}}</strong><br>
        {{{{CARGO}}}} - {{{{AREA}}}}</p>
        <p>De nuestra consideración:</p>
        <p>Por medio del presente, <strong>{{{{EMPRESA}}}}</strong>, a través del área de Recursos Humanos, emite el documento <strong>{name}</strong> de la categoría <strong>{category}</strong>, conforme a la información registrada en el sistema SAE - RRHH.</p>
        <section class=""employee-data"">
          <dl>
            <dt>Colaborador</dt><dd>{{{{NOMBRE_COMPLETO}}}}</dd>
            <dt>DNI / CE</dt><dd>{{{{DNI}}}}</dd>
            <dt>Codigo</dt><dd>{{{{CODIGO_EMPLEADO}}}}</dd>
            <dt>Cargo</dt><dd>{{{{CARGO}}}}</dd>
            <dt>Area</dt><dd>{{{{AREA}}}}</dd>
            <dt>Sede</dt><dd>{{{{SEDE}}}}</dd>
            <dt>Ingreso</dt><dd>{{{{FECHA_INGRESO}}}}</dd>
          </dl>
        </section>
        <p>{description}</p>
        <p>{{{{DETALLE_DOCUMENTO}}}}</p>
        <p>El presente documento queda registrado en SAE - RRHH para los fines administrativos, laborales y de trazabilidad que correspondan.</p>
        <p>Atentamente,</p>
        <section class=""signature-grid"">
          <div class=""signature-box"">
            <strong>{{{{NOMBRE_COMPLETO}}}}</strong>
            <small>DNI: {{{{DNI}}}}</small>
            <small>Colaborador</small>
          </div>
          <div class=""signature-box"">
            <strong>Recursos Humanos</strong>
            <small>{{{{EMPRESA}}}}</small>
            <small>Representante autorizado</small>
          </div>
        </section>
        ";
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
