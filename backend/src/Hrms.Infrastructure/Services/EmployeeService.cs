using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Employees;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class EmployeeService(HrmsDbContext dbContext, IAuditService auditService, IIntegrationService integrationService) : IEmployeeService
{
    public async Task<PagedResultDto<EmployeeListItemDto>> GetPagedAsync(EmployeeQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var employeesQuery = dbContext.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Include(x => x.Branch)
            .Include(x => x.Position)
            .Include(x => x.ContractType)
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            employeesQuery = employeesQuery.Where(x =>
                x.EmployeeCode.ToLower().Contains(search) ||
                x.FirstName.ToLower().Contains(search) ||
                x.LastName.ToLower().Contains(search) ||
                x.DocumentNumber.ToLower().Contains(search) ||
                x.PersonalEmail.ToLower().Contains(search) ||
                x.WorkEmail.ToLower().Contains(search));
        }

        if (query.AreaId.HasValue)
        {
            employeesQuery = employeesQuery.Where(x => x.AreaId == query.AreaId.Value);
        }

        if (query.BranchId.HasValue)
        {
            employeesQuery = employeesQuery.Where(x => x.BranchId == query.BranchId.Value);
        }

        if (query.PositionId.HasValue)
        {
            employeesQuery = employeesQuery.Where(x => x.PositionId == query.PositionId.Value);
        }

        if (query.ContractTypeId.HasValue)
        {
            employeesQuery = employeesQuery.Where(x => x.ContractTypeId == query.ContractTypeId.Value);
        }

        if (query.IsActive.HasValue)
        {
            employeesQuery = employeesQuery.Where(x => x.IsActive == query.IsActive.Value);
        }

        employeesQuery = ApplySort(employeesQuery, query.SortBy, query.SortDirection);

        var totalCount = await employeesQuery.CountAsync(cancellationToken);

        var items = await employeesQuery
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new EmployeeListItemDto(
                x.Id,
                x.EmployeeCode,
                $"{x.FirstName} {x.LastName}",
                x.DocumentNumber,
                x.Area.Name,
                x.Position.Name,
                x.Branch.Name,
                x.ContractType.Name,
                x.HireDate,
                x.BaseSalary,
                x.IsActive))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<EmployeeListItemDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<EmployeeDetailDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees
            .AsNoTracking()
            .Include(x => x.Area)
            .Include(x => x.Branch)
            .Include(x => x.Position)
            .Include(x => x.ContractType)
            .Include(x => x.Manager)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        return employee is null ? null : ToDetailDto(employee);
    }

    public async Task<EmployeeDetailDto> CreateAsync(CreateEmployeeRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidatePayload(request.EmployeeCode, request.FirstName, request.LastName, request.DocumentType, request.DocumentNumber, request.HireDate, request.BirthDate, request.BaseSalary, request.WorkEmail);

        await ValidateCatalogsAsync(request.BranchId, request.AreaId, request.PositionId, request.ContractTypeId, request.ManagerId, cancellationToken);
        await EnsureUniquenessAsync(request.EmployeeCode, request.DocumentNumber, request.WorkEmail, request.PersonalEmail, null, cancellationToken);

        var employee = new Employee
        {
            EmployeeCode = request.EmployeeCode.Trim().ToUpperInvariant(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            DocumentType = request.DocumentType.Trim().ToUpperInvariant(),
            DocumentNumber = request.DocumentNumber.Trim().ToUpperInvariant(),
            BirthDate = request.BirthDate,
            HireDate = request.HireDate,
            BaseSalary = request.BaseSalary,
            PersonalEmail = request.PersonalEmail.Trim().ToLowerInvariant(),
            WorkEmail = request.WorkEmail.Trim().ToLowerInvariant(),
            PhoneNumber = request.PhoneNumber.Trim(),
            ProfilePhotoUrl = request.ProfilePhotoUrl?.Trim(),
            Notes = request.Notes?.Trim(),
            EmergencyContactName = request.EmergencyContactName?.Trim(),
            EmergencyContactPhone = request.EmergencyContactPhone?.Trim(),
            ContractEndDate = request.ContractEndDate,
            BankName = NormalizeBank(request.BankName),
            BankAccountNumber = request.BankAccountNumber?.Trim(),
            BankAccountCci = request.BankAccountCci?.Trim(),
            BankAccountType = NormalizeAccountType(request.BankAccountType),
            BankCurrency = NormalizeCurrency(request.BankCurrency),
            BranchId = request.BranchId,
            AreaId = request.AreaId,
            PositionId = request.PositionId,
            ContractTypeId = request.ContractTypeId,
            ManagerId = request.ManagerId,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.Employees.AddAsync(employee, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var created = await GetByIdAsync(employee.Id, cancellationToken)
            ?? throw new InvalidOperationException("No se pudo crear el empleado.");

        await integrationService.DispatchEventAsync("employee.created", new
        {
            id = employee.Id,
            employeeCode = employee.EmployeeCode,
            fullName = $"{employee.FirstName} {employee.LastName}",
            hireDate = employee.HireDate,
            workEmail = employee.WorkEmail
        }, cancellationToken);

        return created;
    }

    public async Task<EmployeeDetailDto?> UpdateAsync(Guid id, UpdateEmployeeRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidatePayload(request.EmployeeCode, request.FirstName, request.LastName, request.DocumentType, request.DocumentNumber, request.HireDate, request.BirthDate, request.BaseSalary, request.WorkEmail);

        var employee = await dbContext.Employees
            .Include(x => x.Area)
            .Include(x => x.Position)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (employee is null)
        {
            return null;
        }

        if (request.ManagerId.HasValue && request.ManagerId == id)
        {
            throw new InvalidOperationException("Un empleado no puede ser su propio jefe directo.");
        }

        await ValidateCatalogsAsync(request.BranchId, request.AreaId, request.PositionId, request.ContractTypeId, request.ManagerId, cancellationToken);
        await EnsureUniquenessAsync(request.EmployeeCode, request.DocumentNumber, request.WorkEmail, request.PersonalEmail, id, cancellationToken);

        var changeLogs = new List<EmployeeChangeLog>();
        var now = DateTime.UtcNow;

        if (employee.BaseSalary != request.BaseSalary)
        {
            changeLogs.Add(new EmployeeChangeLog
            {
                EmployeeId = id,
                ChangeType = "SalaryChange",
                FieldName = "BaseSalary",
                OldValue = employee.BaseSalary.ToString("F2"),
                NewValue = request.BaseSalary.ToString("F2"),
                ChangedAtUtc = now
            });
        }

        if (employee.PositionId != request.PositionId)
        {
            var newPositionName = await dbContext.Positions
                .Where(x => x.Id == request.PositionId)
                .Select(x => x.Name)
                .FirstOrDefaultAsync(cancellationToken);

            changeLogs.Add(new EmployeeChangeLog
            {
                EmployeeId = id,
                ChangeType = "PositionChange",
                FieldName = "PositionId",
                OldValue = employee.Position.Name,
                NewValue = newPositionName,
                ChangedAtUtc = now
            });
        }

        if (employee.AreaId != request.AreaId)
        {
            var newAreaName = await dbContext.Areas
                .Where(x => x.Id == request.AreaId)
                .Select(x => x.Name)
                .FirstOrDefaultAsync(cancellationToken);

            changeLogs.Add(new EmployeeChangeLog
            {
                EmployeeId = id,
                ChangeType = "AreaChange",
                FieldName = "AreaId",
                OldValue = employee.Area.Name,
                NewValue = newAreaName,
                ChangedAtUtc = now
            });
        }

        employee.EmployeeCode = request.EmployeeCode.Trim().ToUpperInvariant();
        employee.FirstName = request.FirstName.Trim();
        employee.LastName = request.LastName.Trim();
        employee.DocumentType = request.DocumentType.Trim().ToUpperInvariant();
        employee.DocumentNumber = request.DocumentNumber.Trim().ToUpperInvariant();
        employee.BirthDate = request.BirthDate;
        employee.HireDate = request.HireDate;
        employee.BaseSalary = request.BaseSalary;
        employee.PersonalEmail = request.PersonalEmail.Trim().ToLowerInvariant();
        employee.WorkEmail = request.WorkEmail.Trim().ToLowerInvariant();
        employee.PhoneNumber = request.PhoneNumber.Trim();
        employee.ProfilePhotoUrl = request.ProfilePhotoUrl?.Trim();
        employee.Notes = request.Notes?.Trim();
        employee.EmergencyContactName = request.EmergencyContactName?.Trim();
        employee.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
        employee.ContractEndDate = request.ContractEndDate;
        employee.BankName = NormalizeBank(request.BankName);
        employee.BankAccountNumber = request.BankAccountNumber?.Trim();
        employee.BankAccountCci = request.BankAccountCci?.Trim();
        employee.BankAccountType = NormalizeAccountType(request.BankAccountType);
        employee.BankCurrency = NormalizeCurrency(request.BankCurrency);
        employee.BranchId = request.BranchId;
        employee.AreaId = request.AreaId;
        employee.PositionId = request.PositionId;
        employee.ContractTypeId = request.ContractTypeId;
        employee.ManagerId = request.ManagerId;
        employee.UpdatedAtUtc = now;
        employee.UpdatedBy = "system";

        if (changeLogs.Count > 0)
        {
            await dbContext.EmployeeChangeLogs.AddRangeAsync(changeLogs, cancellationToken);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        await integrationService.DispatchEventAsync("employee.updated", new
        {
            id = employee.Id,
            employeeCode = employee.EmployeeCode,
            fullName = $"{employee.FirstName} {employee.LastName}",
            workEmail = employee.WorkEmail
        }, cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (employee is null)
        {
            return false;
        }

        employee.IsActive = isActive;
        employee.UpdatedAtUtc = DateTime.UtcNow;
        employee.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var employee = await dbContext.Employees.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (employee is null)
        {
            return false;
        }

        employee.IsDeleted = true;
        employee.IsActive = false;
        employee.UpdatedAtUtc = DateTime.UtcNow;
        employee.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        await integrationService.DispatchEventAsync("employee.terminated", new
        {
            id = employee.Id,
            employeeCode = employee.EmployeeCode,
            fullName = $"{employee.FirstName} {employee.LastName}"
        }, cancellationToken);

        return true;
    }

    public async Task<EmployeeCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default)
    {
        var branches = await dbContext.Branches.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new EmployeeCatalogOptionDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        var areas = await dbContext.Areas.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new EmployeeCatalogOptionDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        var positions = await dbContext.Positions.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new EmployeeCatalogOptionDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        var contractTypes = await dbContext.ContractTypes.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new EmployeeCatalogOptionDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        var managers = await dbContext.Employees.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .Select(x => new EmployeeCatalogOptionDto(x.Id, x.EmployeeCode + " - " + x.FirstName + " " + x.LastName))
            .ToListAsync(cancellationToken);

        return new EmployeeCatalogsDto(branches, areas, positions, contractTypes, managers);
    }

    public async Task<IReadOnlyList<Application.DTOs.Employees.EmployeeChangeLogDto>> GetChangeLogAsync(Guid employeeId, CancellationToken cancellationToken = default)
    {
        return await dbContext.EmployeeChangeLogs
            .AsNoTracking()
            .Where(x => x.EmployeeId == employeeId)
            .OrderByDescending(x => x.ChangedAtUtc)
            .Select(x => new Application.DTOs.Employees.EmployeeChangeLogDto(
                x.Id,
                x.EmployeeId,
                x.ChangeType,
                x.FieldName,
                x.OldValue,
                x.NewValue,
                x.Reason,
                x.ChangedByUserId,
                x.ChangedByUserName,
                x.ChangedAtUtc))
            .ToListAsync(cancellationToken);
    }

    private static IOrderedQueryable<Employee> ApplySort(IQueryable<Employee> query, string? sortBy, string? direction)
    {
        var desc = string.Equals(direction, "desc", StringComparison.OrdinalIgnoreCase);
        var key = sortBy?.Trim().ToLowerInvariant();

        return key switch
        {
            "employeecode" => desc ? query.OrderByDescending(x => x.EmployeeCode) : query.OrderBy(x => x.EmployeeCode),
            "hiredate" => desc ? query.OrderByDescending(x => x.HireDate) : query.OrderBy(x => x.HireDate),
            "basesalary" => desc ? query.OrderByDescending(x => x.BaseSalary) : query.OrderBy(x => x.BaseSalary),
            "createdat" => desc ? query.OrderByDescending(x => x.CreatedAtUtc) : query.OrderBy(x => x.CreatedAtUtc),
            _ => desc
                ? query.OrderByDescending(x => x.FirstName).ThenByDescending(x => x.LastName)
                : query.OrderBy(x => x.FirstName).ThenBy(x => x.LastName)
        };
    }

    private static EmployeeDetailDto ToDetailDto(Employee employee)
    {
        return new EmployeeDetailDto(
            employee.Id,
            employee.EmployeeCode,
            employee.FirstName,
            employee.LastName,
            employee.DocumentType,
            employee.DocumentNumber,
            employee.BirthDate,
            employee.HireDate,
            employee.BaseSalary,
            employee.PersonalEmail,
            employee.WorkEmail,
            employee.PhoneNumber,
            employee.ProfilePhotoUrl,
            employee.Notes,
            employee.EmergencyContactName,
            employee.EmergencyContactPhone,
            employee.ContractEndDate,
            employee.BankName,
            employee.BankAccountNumber,
            employee.BankAccountCci,
            employee.BankAccountType,
            employee.BankCurrency,
            employee.BranchId,
            employee.Branch.Name,
            employee.AreaId,
            employee.Area.Name,
            employee.PositionId,
            employee.Position.Name,
            employee.ContractTypeId,
            employee.ContractType.Name,
            employee.ManagerId,
            employee.Manager is null ? null : employee.Manager.FirstName + " " + employee.Manager.LastName,
            employee.IsActive);
    }

    private static void ValidatePayload(
        string employeeCode,
        string firstName,
        string lastName,
        string documentType,
        string documentNumber,
        DateOnly hireDate,
        DateOnly birthDate,
        decimal baseSalary,
        string workEmail)
    {
        if (string.IsNullOrWhiteSpace(employeeCode))
        {
            throw new InvalidOperationException("El codigo de empleado es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
        {
            throw new InvalidOperationException("Nombres y apellidos son obligatorios.");
        }

        if (string.IsNullOrWhiteSpace(documentNumber))
        {
            throw new InvalidOperationException("El numero de documento es obligatorio.");
        }

        // DNI format validation: 8 digits
        if (string.Equals(documentType?.Trim(), "DNI", StringComparison.OrdinalIgnoreCase))
        {
            var trimmedDoc = documentNumber.Trim();
            if (trimmedDoc.Length != 8 || !trimmedDoc.All(char.IsDigit))
            {
                throw new InvalidOperationException("El DNI debe tener exactamente 8 digitos numericos.");
            }
        }

        if (hireDate <= birthDate)
        {
            throw new InvalidOperationException("La fecha de ingreso debe ser mayor que la fecha de nacimiento.");
        }

        // Minimum age validation: 18 years
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - birthDate.Year;
        if (birthDate > today.AddYears(-age)) age--;
        if (age < 18)
        {
            throw new InvalidOperationException("El empleado debe tener al menos 18 anos de edad.");
        }

        if (baseSalary < 0)
        {
            throw new InvalidOperationException("El sueldo base no puede ser negativo.");
        }

        if (string.IsNullOrWhiteSpace(workEmail) || !workEmail.Contains('@'))
        {
            throw new InvalidOperationException("El correo corporativo no tiene un formato valido.");
        }
    }

    private async Task ValidateCatalogsAsync(
        Guid branchId,
        Guid areaId,
        Guid positionId,
        Guid contractTypeId,
        Guid? managerId,
        CancellationToken cancellationToken)
    {
        var branchExists = await dbContext.Branches.AnyAsync(x => x.Id == branchId && !x.IsDeleted, cancellationToken);
        if (!branchExists)
        {
            throw new InvalidOperationException("La sede seleccionada no existe.");
        }

        var areaExists = await dbContext.Areas.AnyAsync(x => x.Id == areaId && !x.IsDeleted, cancellationToken);
        if (!areaExists)
        {
            throw new InvalidOperationException("El �rea seleccionada no existe.");
        }

        var positionExists = await dbContext.Positions.AnyAsync(x => x.Id == positionId && !x.IsDeleted, cancellationToken);
        if (!positionExists)
        {
            throw new InvalidOperationException("El cargo seleccionado no existe.");
        }

        var contractTypeExists = await dbContext.ContractTypes.AnyAsync(x => x.Id == contractTypeId && !x.IsDeleted, cancellationToken);
        if (!contractTypeExists)
        {
            throw new InvalidOperationException("El tipo de contrato seleccionado no existe.");
        }

        if (!managerId.HasValue)
        {
            return;
        }

        var managerExists = await dbContext.Employees.AnyAsync(x => x.Id == managerId.Value && !x.IsDeleted, cancellationToken);
        if (!managerExists)
        {
            throw new InvalidOperationException("El jefe directo seleccionado no existe.");
        }
    }

    private async Task EnsureUniquenessAsync(
        string employeeCode,
        string documentNumber,
        string workEmail,
        string personalEmail,
        Guid? currentId,
        CancellationToken cancellationToken)
    {
        var normalizedCode = employeeCode.Trim().ToUpperInvariant();
        var normalizedDocument = documentNumber.Trim().ToUpperInvariant();
        var normalizedWorkEmail = workEmail.Trim().ToLowerInvariant();
        var normalizedPersonalEmail = personalEmail.Trim().ToLowerInvariant();

        var codeExists = await dbContext.Employees.AnyAsync(
            x => x.EmployeeCode == normalizedCode && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("Ya existe un empleado con ese c�digo.");
        }

        var documentExists = await dbContext.Employees.AnyAsync(
            x => x.DocumentNumber == normalizedDocument && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (documentExists)
        {
            throw new InvalidOperationException("Ya existe un empleado con ese documento.");
        }

        var workEmailExists = await dbContext.Employees.AnyAsync(
            x => x.WorkEmail == normalizedWorkEmail && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (workEmailExists)
        {
            throw new InvalidOperationException("Ya existe un empleado con ese correo corporativo.");
        }

        if (string.IsNullOrWhiteSpace(normalizedPersonalEmail))
        {
            return;
        }

        var personalEmailExists = await dbContext.Employees.AnyAsync(
            x => x.PersonalEmail == normalizedPersonalEmail && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (personalEmailExists)
        {
            throw new InvalidOperationException("Ya existe un empleado con ese correo personal.");
        }
    }

    // ── Normalizacion de datos bancarios ──────────────────────────────────
    // Vacios se tratan como null para que la DB no acumule strings vacios "en blanco".
    private static string? NormalizeBank(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed.ToUpperInvariant();
    }

    private static string? NormalizeAccountType(string? value)
    {
        var trimmed = value?.Trim().ToLowerInvariant();
        return trimmed switch
        {
            "savings" or "ahorros" => "savings",
            "checking" or "corriente" => "checking",
            _ => null
        };
    }

    private static string? NormalizeCurrency(string? value)
    {
        var trimmed = value?.Trim().ToUpperInvariant();
        return trimmed switch
        {
            "PEN" or "USD" => trimmed,
            null or "" => null,
            _ => null
        };
    }
}
