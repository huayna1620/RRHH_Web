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
        var result = await GetPagedAsync(
            branchQuery,
            query,
            item => dbContext.Employees.Count(x => x.BranchId == item.Id && !x.IsDeleted),
            cancellationToken);

        return result;
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
        return new ConfigurationItemDto(branch.Id, branch.Code, branch.Name, branch.IsActive, employeesCount);
    }

    public async Task<ConfigurationItemDto> CreateBranchAsync(CreateConfigurationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateItemPayload(request.Code, request.Name);
        await EnsureBranchUniquenessAsync(request.Code, request.Name, null, cancellationToken);

        var branch = new Branch
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.Branches.AddAsync(branch, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new ConfigurationItemDto(branch.Id, branch.Code, branch.Name, branch.IsActive, 0);
    }

    public async Task<ConfigurationItemDto?> UpdateBranchAsync(Guid id, UpdateConfigurationItemRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidateItemPayload(request.Code, request.Name);

        var branch = await dbContext.Branches.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (branch is null)
        {
            return null;
        }

        await EnsureBranchUniquenessAsync(request.Code, request.Name, id, cancellationToken);

        branch.Code = request.Code.Trim().ToUpperInvariant();
        branch.Name = request.Name.Trim();
        branch.UpdatedAtUtc = DateTime.UtcNow;
        branch.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        var employeesCount = await dbContext.Employees.CountAsync(x => x.BranchId == id && !x.IsDeleted, cancellationToken);
        return new ConfigurationItemDto(branch.Id, branch.Code, branch.Name, branch.IsActive, employeesCount);
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
