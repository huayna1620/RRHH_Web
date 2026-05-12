using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Configuration;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class ConfigurationService(HrmsDbContext dbContext) : IConfigurationService
{
    public async Task<PagedResultDto<ConfigurationItemDto>> GetBranchesAsync(ConfigurationQueryDto query, CancellationToken cancellationToken = default)
    {
        var branchQuery = dbContext.Branches.AsNoTracking().Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            branchQuery = branchQuery.Where(x =>
                x.Name.ToLower().Contains(search) ||
                x.Code.ToLower().Contains(search) ||
                x.City.ToLower().Contains(search) ||
                x.Region.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Location))
        {
            var location = query.Location.Trim().ToLowerInvariant();
            branchQuery = branchQuery.Where(x =>
                x.City.ToLower().Contains(location) ||
                x.Region.ToLower().Contains(location) ||
                x.Country.ToLower().Contains(location));
        }

        if (query.IsActive.HasValue)
        {
            branchQuery = branchQuery.Where(x => x.IsActive == query.IsActive.Value);
        }

        var ordered = ApplySort(branchQuery, query.SortBy, query.SortDirection);
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);
        var totalCount = await ordered.CountAsync(cancellationToken);

        var records = await ordered
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var ids = records.Select(x => x.Id).ToList();
        var employeeCounts = await dbContext.Employees.AsNoTracking()
            .Where(x => ids.Contains(x.BranchId) && !x.IsDeleted)
            .GroupBy(x => x.BranchId)
            .Select(x => new { BranchId = x.Key, Count = x.Count() })
            .ToDictionaryAsync(x => x.BranchId, x => x.Count, cancellationToken);

        var items = records.Select(branch => ToBranchDto(branch, employeeCounts.GetValueOrDefault(branch.Id))).ToList();
        return new PagedResultDto<ConfigurationItemDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<ConfigurationItemDto?> GetBranchByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var branch = await dbContext.Branches.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (branch is null)
        {
            return null;
        }

        var employeesCount = await dbContext.Employees.CountAsync(x => x.BranchId == id && !x.IsDeleted, cancellationToken);
        return ToBranchDto(branch, employeesCount);
    }

    public async Task<ConfigurationItemDto> CreateBranchAsync(CreateConfigurationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateItemPayload(request.Code, request.Name);
        ValidateBranchPayload(request.BranchType, request.Region, request.City, request.Address, request.Email, request.Phone, request.Capacity);
        await EnsureBranchUniquenessAsync(request.Code, request.Name, null, cancellationToken);

        var branch = new Branch
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            BranchType = NormalizeOptional(request.BranchType) ?? "Administrativa",
            Description = NormalizeOptional(request.Description),
            Country = NormalizeOptional(request.Country) ?? "Perú",
            Region = NormalizeOptional(request.Region) ?? string.Empty,
            City = NormalizeOptional(request.City) ?? string.Empty,
            Address = NormalizeOptional(request.Address) ?? string.Empty,
            Phone = NormalizeOptional(request.Phone),
            Email = NormalizeOptional(request.Email),
            ResponsibleName = NormalizeOptional(request.ResponsibleName),
            ResponsibleTitle = NormalizeOptional(request.ResponsibleTitle),
            Capacity = NormalizeCapacity(request.Capacity),
            BusinessHours = NormalizeOptional(request.BusinessHours),
            CostCenter = NormalizeOptional(request.CostCenter),
            OpenedAtUtc = request.OpenedAtUtc,
            IsActive = request.IsActive ?? true,
            VisibleForAssignments = request.VisibleForAssignments ?? true,
            RequiresApprovalForChanges = request.RequiresApprovalForChanges ?? false,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.Branches.AddAsync(branch, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return ToBranchDto(branch, 0);
    }

    public async Task<ConfigurationItemDto?> UpdateBranchAsync(Guid id, UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateItemPayload(request.Code, request.Name);
        ValidateBranchPayload(request.BranchType, request.Region, request.City, request.Address, request.Email, request.Phone, request.Capacity);

        var branch = await dbContext.Branches.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (branch is null)
        {
            return null;
        }

        await EnsureBranchUniquenessAsync(request.Code, request.Name, id, cancellationToken);

        branch.Code = request.Code.Trim().ToUpperInvariant();
        branch.Name = request.Name.Trim();
        branch.BranchType = NormalizeOptional(request.BranchType) ?? "Administrativa";
        branch.Description = NormalizeOptional(request.Description);
        branch.Country = NormalizeOptional(request.Country) ?? "Perú";
        branch.Region = NormalizeOptional(request.Region) ?? string.Empty;
        branch.City = NormalizeOptional(request.City) ?? string.Empty;
        branch.Address = NormalizeOptional(request.Address) ?? string.Empty;
        branch.Phone = NormalizeOptional(request.Phone);
        branch.Email = NormalizeOptional(request.Email);
        branch.ResponsibleName = NormalizeOptional(request.ResponsibleName);
        branch.ResponsibleTitle = NormalizeOptional(request.ResponsibleTitle);
        branch.Capacity = NormalizeCapacity(request.Capacity);
        branch.BusinessHours = NormalizeOptional(request.BusinessHours);
        branch.CostCenter = NormalizeOptional(request.CostCenter);
        branch.OpenedAtUtc = request.OpenedAtUtc;
        branch.IsActive = request.IsActive ?? branch.IsActive;
        branch.VisibleForAssignments = request.VisibleForAssignments ?? branch.VisibleForAssignments;
        branch.RequiresApprovalForChanges = request.RequiresApprovalForChanges ?? branch.RequiresApprovalForChanges;
        branch.UpdatedAtUtc = DateTime.UtcNow;
        branch.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        var employeesCount = await dbContext.Employees.CountAsync(x => x.BranchId == id && !x.IsDeleted, cancellationToken);
        return ToBranchDto(branch, employeesCount);
    }

    public async Task<bool> UpdateBranchStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var branch = await dbContext.Branches.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (branch is null)
        {
            return false;
        }

        branch.IsActive = isActive;
        branch.UpdatedAtUtc = DateTime.UtcNow;
        branch.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteBranchAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var branch = await dbContext.Branches.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (branch is null)
        {
            return false;
        }

        var hasEmployees = await dbContext.Employees.AnyAsync(x => x.BranchId == id && !x.IsDeleted, cancellationToken);
        if (hasEmployees)
        {
            throw new InvalidOperationException("No se puede eliminar una sede con empleados asignados.");
        }

        branch.IsDeleted = true;
        branch.IsActive = false;
        branch.UpdatedAtUtc = DateTime.UtcNow;
        branch.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PagedResultDto<ConfigurationItemDto>> GetContractTypesAsync(ConfigurationQueryDto query, CancellationToken cancellationToken = default)
    {
        var contractTypeQuery = dbContext.ContractTypes.AsNoTracking().Where(x => !x.IsDeleted);
        var result = await GetPagedAsync(
            contractTypeQuery,
            query,
            item => dbContext.Employees.Count(x => x.ContractTypeId == item.Id && !x.IsDeleted),
            cancellationToken);

        return result;
    }

    public async Task<ConfigurationItemDto?> GetContractTypeByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contractType = await dbContext.ContractTypes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (contractType is null)
        {
            return null;
        }

        var employeesCount = await dbContext.Employees.CountAsync(x => x.ContractTypeId == id && !x.IsDeleted, cancellationToken);
        return new ConfigurationItemDto(contractType.Id, contractType.Code, contractType.Name, contractType.IsActive, employeesCount);
    }

    public async Task<ConfigurationItemDto> CreateContractTypeAsync(CreateConfigurationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateItemPayload(request.Code, request.Name);
        await EnsureContractTypeUniquenessAsync(request.Code, request.Name, null, cancellationToken);

        var contractType = new ContractType
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.ContractTypes.AddAsync(contractType, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new ConfigurationItemDto(contractType.Id, contractType.Code, contractType.Name, contractType.IsActive, 0);
    }

    public async Task<ConfigurationItemDto?> UpdateContractTypeAsync(Guid id, UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateItemPayload(request.Code, request.Name);

        var contractType = await dbContext.ContractTypes.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (contractType is null)
        {
            return null;
        }

        await EnsureContractTypeUniquenessAsync(request.Code, request.Name, id, cancellationToken);

        contractType.Code = request.Code.Trim().ToUpperInvariant();
        contractType.Name = request.Name.Trim();
        contractType.UpdatedAtUtc = DateTime.UtcNow;
        contractType.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        var employeesCount = await dbContext.Employees.CountAsync(x => x.ContractTypeId == id && !x.IsDeleted, cancellationToken);
        return new ConfigurationItemDto(contractType.Id, contractType.Code, contractType.Name, contractType.IsActive, employeesCount);
    }

    public async Task<bool> UpdateContractTypeStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var contractType = await dbContext.ContractTypes.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (contractType is null)
        {
            return false;
        }

        contractType.IsActive = isActive;
        contractType.UpdatedAtUtc = DateTime.UtcNow;
        contractType.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteContractTypeAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contractType = await dbContext.ContractTypes.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (contractType is null)
        {
            return false;
        }

        var hasEmployees = await dbContext.Employees.AnyAsync(x => x.ContractTypeId == id && !x.IsDeleted, cancellationToken);
        if (hasEmployees)
        {
            throw new InvalidOperationException("No se puede eliminar un tipo de contrato con empleados asignados.");
        }

        contractType.IsDeleted = true;
        contractType.IsActive = false;
        contractType.UpdatedAtUtc = DateTime.UtcNow;
        contractType.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<GeneralSettingDto>> GetGeneralSettingsAsync(GeneralSettingsQueryDto query, CancellationToken cancellationToken = default)
    {
        var settingsQuery = dbContext.GeneralSettings
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            settingsQuery = settingsQuery.Where(x =>
                x.Key.ToLower().Contains(search) ||
                x.Value.ToLower().Contains(search) ||
                (x.Description != null && x.Description.ToLower().Contains(search)));
        }

        var items = await settingsQuery
            .OrderBy(x => x.Key)
            .Select(x => new GeneralSettingDto(
                x.Id,
                x.Key,
                x.Value,
                x.Description,
                x.IsSensitive,
                x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);

        return items;
    }

    public async Task<GeneralSettingDto> UpsertGeneralSettingAsync(string key, UpsertGeneralSettingRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("La clave del parametro es obligatoria.");
        }

        if (string.IsNullOrWhiteSpace(request.Value))
        {
            throw new InvalidOperationException("El valor del parametro es obligatorio.");
        }

        var normalizedKey = key.Trim().ToLowerInvariant();
        if (normalizedKey.Length is < 2 or > 100)
        {
            throw new InvalidOperationException("La clave debe tener entre 2 y 100 caracteres.");
        }

        if (!normalizedKey.All(static ch => char.IsLetterOrDigit(ch) || ch is '.' or '_' or '-'))
        {
            throw new InvalidOperationException("La clave solo permite letras, numeros, punto, guion y guion bajo.");
        }

        var setting = await dbContext.GeneralSettings
            .FirstOrDefaultAsync(x => x.Key == normalizedKey && !x.IsDeleted, cancellationToken);

        if (setting is null)
        {
            setting = new GeneralSetting
            {
                Key = normalizedKey,
                Value = request.Value.Trim(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                IsSensitive = request.IsSensitive,
                CreatedBy = "system",
                UpdatedBy = "system"
            };

            await dbContext.GeneralSettings.AddAsync(setting, cancellationToken);
        }
        else
        {
            setting.Value = request.Value.Trim();
            setting.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            setting.IsSensitive = request.IsSensitive;
            setting.UpdatedAtUtc = DateTime.UtcNow;
            setting.UpdatedBy = "system";
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return new GeneralSettingDto(
            setting.Id,
            setting.Key,
            setting.Value,
            setting.Description,
            setting.IsSensitive,
            setting.UpdatedAtUtc);
    }

    public async Task<bool> DeleteGeneralSettingAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var setting = await dbContext.GeneralSettings.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (setting is null)
        {
            return false;
        }

        setting.IsDeleted = true;
        setting.IsActive = false;
        setting.UpdatedAtUtc = DateTime.UtcNow;
        setting.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static ConfigurationItemDto ToBranchDto(Branch branch, int employeesCount)
    {
        return new ConfigurationItemDto(
            branch.Id,
            branch.Code,
            branch.Name,
            branch.IsActive,
            employeesCount,
            branch.BranchType,
            branch.Description,
            branch.Country,
            branch.Region,
            branch.City,
            branch.Address,
            branch.Phone,
            branch.Email,
            branch.ResponsibleName,
            branch.ResponsibleTitle,
            branch.Capacity,
            branch.BusinessHours,
            branch.CostCenter,
            branch.OpenedAtUtc,
            branch.VisibleForAssignments,
            branch.RequiresApprovalForChanges,
            branch.CreatedAtUtc,
            branch.UpdatedAtUtc,
            branch.CreatedBy,
            branch.UpdatedBy);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static int? NormalizeCapacity(int? capacity)
    {
        return capacity is > 0 ? capacity : null;
    }

    private static void ValidateItemPayload(string code, string name)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length < 2)
        {
            throw new InvalidOperationException("El codigo es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 2)
        {
            throw new InvalidOperationException("El nombre es obligatorio.");
        }
    }

    private static void ValidateBranchPayload(string? branchType, string? region, string? city, string? address, string? email, string? phone, int? capacity)
    {
        if (string.IsNullOrWhiteSpace(branchType))
        {
            throw new InvalidOperationException("El tipo de sede es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(region))
        {
            throw new InvalidOperationException("La region o departamento es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(city))
        {
            throw new InvalidOperationException("La ciudad o provincia es obligatoria.");
        }

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new InvalidOperationException("La direccion es obligatoria.");
        }

        if (!string.IsNullOrWhiteSpace(email) && !email.Contains('@', StringComparison.Ordinal))
        {
            throw new InvalidOperationException("El correo de sede no tiene un formato valido.");
        }

        if (!string.IsNullOrWhiteSpace(phone) && phone.Trim().Length < 6)
        {
            throw new InvalidOperationException("El telefono debe tener al menos 6 caracteres.");
        }

        if (capacity.HasValue && capacity.Value < 0)
        {
            throw new InvalidOperationException("La capacidad estimada no puede ser negativa.");
        }
    }

    private async Task EnsureBranchUniquenessAsync(string code, string name, Guid? currentId, CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var normalizedName = name.Trim().ToLowerInvariant();

        var codeExists = await dbContext.Branches.AnyAsync(
            x => x.Code == normalizedCode && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("Ya existe una sede con ese codigo.");
        }

        var nameExists = await dbContext.Branches.AnyAsync(
            x => x.Name.ToLower() == normalizedName && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe una sede con ese nombre.");
        }
    }

    private async Task EnsureContractTypeUniquenessAsync(string code, string name, Guid? currentId, CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var normalizedName = name.Trim().ToLowerInvariant();

        var codeExists = await dbContext.ContractTypes.AnyAsync(
            x => x.Code == normalizedCode && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("Ya existe un tipo de contrato con ese codigo.");
        }

        var nameExists = await dbContext.ContractTypes.AnyAsync(
            x => x.Name.ToLower() == normalizedName && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe un tipo de contrato con ese nombre.");
        }
    }

    private async Task<PagedResultDto<ConfigurationItemDto>> GetPagedAsync<T>(
        IQueryable<T> query,
        ConfigurationQueryDto request,
        Func<T, int> employeesCounter,
        CancellationToken cancellationToken)
        where T : class
    {
        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : Math.Min(request.PageSize, 100);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            query = query.Where(item =>
                EF.Property<string>(item, "Name").ToLower().Contains(search) ||
                EF.Property<string>(item, "Code").ToLower().Contains(search));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(item => EF.Property<bool>(item, "IsActive") == request.IsActive.Value);
        }

        var ordered = ApplySort(query, request.SortBy, request.SortDirection);
        var totalCount = await ordered.CountAsync(cancellationToken);

        var records = await ordered
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = records
            .Select(item => new ConfigurationItemDto(
                GetRequiredProperty<Guid>(item, "Id"),
                GetRequiredProperty<string>(item, "Code"),
                GetRequiredProperty<string>(item, "Name"),
                GetRequiredProperty<bool>(item, "IsActive"),
                employeesCounter(item)))
            .ToList();

        return new PagedResultDto<ConfigurationItemDto>(items, pageNumber, pageSize, totalCount);
    }

    private static IOrderedQueryable<T> ApplySort<T>(IQueryable<T> query, string? sortBy, string? sortDirection)
        where T : class
    {
        var desc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var key = sortBy?.Trim().ToLowerInvariant();

        return key switch
        {
            "code" => desc
                ? query.OrderByDescending(item => EF.Property<string>(item, "Code"))
                : query.OrderBy(item => EF.Property<string>(item, "Code")),
            _ => desc
                ? query.OrderByDescending(item => EF.Property<string>(item, "Name"))
                : query.OrderBy(item => EF.Property<string>(item, "Name"))
        };
    }

    private static TProperty GetRequiredProperty<TProperty>(object source, string propertyName)
    {
        var property = source.GetType().GetProperty(propertyName);
        if (property is null)
        {
            throw new InvalidOperationException($"No se encontró la propiedad '{propertyName}' en '{source.GetType().Name}'.");
        }

        var value = property.GetValue(source);
        if (value is null)
        {
            throw new InvalidOperationException($"La propiedad '{propertyName}' no puede ser nula.");
        }

        if (value is TProperty typedValue)
        {
            return typedValue;
        }

        throw new InvalidOperationException($"La propiedad '{propertyName}' no es del tipo esperado '{typeof(TProperty).Name}'.");
    }
}
