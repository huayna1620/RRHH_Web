using Hrms.Application.DTOs.Areas;
using Hrms.Application.DTOs.Common;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class AreaService(HrmsDbContext dbContext) : IAreaService
{
    public async Task<PagedResultDto<AreaDto>> GetPagedAsync(AreaQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var areasQuery = dbContext.Areas
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            areasQuery = areasQuery.Where(x => x.Name.ToLower().Contains(search) || x.Code.ToLower().Contains(search));
        }

        if (query.IsActive.HasValue)
        {
            areasQuery = areasQuery.Where(x => x.IsActive == query.IsActive.Value);
        }

        var ordered = ApplySort(areasQuery, query.SortBy, query.SortDirection);

        var totalCount = await ordered.CountAsync(cancellationToken);

        var items = await ordered
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AreaDto(
                x.Id,
                x.Code,
                x.Name,
                x.IsActive,
                dbContext.Employees.Count(e => e.AreaId == x.Id && !e.IsDeleted),
                x.Description,
                x.ResponsibleEmployeeId,
                x.ResponsibleEmployee == null ? null : x.ResponsibleEmployee.FirstName + " " + x.ResponsibleEmployee.LastName,
                x.ResponsibleEmployee == null ? null : x.ResponsibleEmployee.Position.Name))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<AreaDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<AreaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var area = await dbContext.Areas
            .AsNoTracking()
            .Include(x => x.ResponsibleEmployee)
            .ThenInclude(x => x!.Position)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (area is null)
        {
            return null;
        }

        var employeesCount = await dbContext.Employees.CountAsync(x => x.AreaId == area.Id && !x.IsDeleted, cancellationToken);
        return new AreaDto(
            area.Id,
            area.Code,
            area.Name,
            area.IsActive,
            employeesCount,
            area.Description,
            area.ResponsibleEmployeeId,
            area.ResponsibleEmployee is null ? null : $"{area.ResponsibleEmployee.FirstName} {area.ResponsibleEmployee.LastName}",
            area.ResponsibleEmployee?.Position.Name);
    }

    public async Task<AreaDto> CreateAsync(CreateAreaRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidatePayload(request.Code, request.Name);
        await EnsureUniquenessAsync(request.Code, request.Name, null, cancellationToken);

        var area = new Area
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Description = NormalizeOptional(request.Description),
            ResponsibleEmployeeId = request.ResponsibleEmployeeId,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.Areas.AddAsync(area, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new AreaDto(area.Id, area.Code, area.Name, area.IsActive, 0, area.Description, area.ResponsibleEmployeeId, null, null);
    }

    public async Task<AreaDto?> UpdateAsync(Guid id, UpdateAreaRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidatePayload(request.Code, request.Name);

        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (area is null)
        {
            return null;
        }

        await EnsureUniquenessAsync(request.Code, request.Name, id, cancellationToken);

        area.Code = request.Code.Trim().ToUpperInvariant();
        area.Name = request.Name.Trim();
        area.Description = NormalizeOptional(request.Description);
        area.ResponsibleEmployeeId = request.ResponsibleEmployeeId;
        area.UpdatedAtUtc = DateTime.UtcNow;
        area.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        var employeesCount = await dbContext.Employees.CountAsync(x => x.AreaId == area.Id && !x.IsDeleted, cancellationToken);
        var responsible = area.ResponsibleEmployeeId.HasValue
            ? await dbContext.Employees.AsNoTracking().Include(x => x.Position).FirstOrDefaultAsync(x => x.Id == area.ResponsibleEmployeeId.Value && !x.IsDeleted, cancellationToken)
            : null;
        return new AreaDto(
            area.Id,
            area.Code,
            area.Name,
            area.IsActive,
            employeesCount,
            area.Description,
            area.ResponsibleEmployeeId,
            responsible is null ? null : $"{responsible.FirstName} {responsible.LastName}",
            responsible?.Position.Name);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (area is null)
        {
            return false;
        }

        area.IsActive = isActive;
        area.UpdatedAtUtc = DateTime.UtcNow;
        area.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var area = await dbContext.Areas.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (area is null)
        {
            return false;
        }

        var hasEmployees = await dbContext.Employees.AnyAsync(x => x.AreaId == id && !x.IsDeleted, cancellationToken);
        if (hasEmployees)
        {
            throw new InvalidOperationException("No se puede eliminar un area con empleados asignados.");
        }

        area.IsDeleted = true;
        area.IsActive = false;
        area.UpdatedAtUtc = DateTime.UtcNow;
        area.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static IOrderedQueryable<Area> ApplySort(IQueryable<Area> query, string? sortBy, string? sortDirection)
    {
        var desc = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var key = sortBy?.Trim().ToLowerInvariant();

        return key switch
        {
            "code" => desc ? query.OrderByDescending(x => x.Code) : query.OrderBy(x => x.Code),
            _ => desc ? query.OrderByDescending(x => x.Name) : query.OrderBy(x => x.Name)
        };
    }

    private static void ValidatePayload(string code, string name)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length < 2)
        {
            throw new InvalidOperationException("El codigo del area es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 2)
        {
            throw new InvalidOperationException("El nombre del area es obligatorio.");
        }
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task EnsureUniquenessAsync(string code, string name, Guid? currentId, CancellationToken cancellationToken)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        var normalizedName = name.Trim().ToLowerInvariant();

        var codeExists = await dbContext.Areas.AnyAsync(
            x => x.Code == normalizedCode && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("Ya existe un area con ese codigo.");
        }

        var nameExists = await dbContext.Areas.AnyAsync(
            x => x.Name.ToLower() == normalizedName && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe un area con ese nombre.");
        }
    }
}

