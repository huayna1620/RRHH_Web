using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Positions;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class PositionService(HrmsDbContext dbContext) : IPositionService
{
    public async Task<PagedResultDto<PositionDto>> GetPagedAsync(PositionQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var positionsQuery = dbContext.Positions
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            positionsQuery = positionsQuery.Where(x => x.Name.ToLower().Contains(search) || x.Code.ToLower().Contains(search));
        }

        if (query.IsActive.HasValue)
        {
            positionsQuery = positionsQuery.Where(x => x.IsActive == query.IsActive.Value);
        }

        var ordered = ApplySort(positionsQuery, query.SortBy, query.SortDirection);

        var totalCount = await ordered.CountAsync(cancellationToken);

        var items = await ordered
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new PositionDto(
                x.Id,
                x.Code,
                x.Name,
                x.IsActive,
                dbContext.Employees.Count(e => e.PositionId == x.Id && !e.IsDeleted),
                x.Description,
                x.Level,
                x.AreaId,
                x.Area == null ? null : x.Area.Name,
                x.ReportsToEmployeeId,
                x.ReportsToEmployee == null ? null : x.ReportsToEmployee.FirstName + " " + x.ReportsToEmployee.LastName))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<PositionDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<PositionDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var position = await dbContext.Positions.AsNoTracking()
            .Include(x => x.Area)
            .Include(x => x.ReportsToEmployee)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (position is null)
        {
            return null;
        }

        var employeesCount = await dbContext.Employees.CountAsync(x => x.PositionId == position.Id && !x.IsDeleted, cancellationToken);
        var reportsToName = position.ReportsToEmployee is null
            ? null
            : $"{position.ReportsToEmployee.FirstName} {position.ReportsToEmployee.LastName}";
        return new PositionDto(position.Id, position.Code, position.Name, position.IsActive, employeesCount, position.Description, position.Level, position.AreaId, position.Area?.Name, position.ReportsToEmployeeId, reportsToName);
    }

    public async Task<PositionDto> CreateAsync(CreatePositionRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidatePayload(request.Code, request.Name);
        await EnsureUniquenessAsync(request.Code, request.Name, null, cancellationToken);

        var position = new Position
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Description = NormalizeOptional(request.Description),
            Level = NormalizeOptional(request.Level),
            AreaId = request.AreaId,
            ReportsToEmployeeId = request.ReportsToEmployeeId,
            CreatedBy = "system",
            UpdatedBy = "system"
        };

        await dbContext.Positions.AddAsync(position, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var areaName = position.AreaId.HasValue
            ? await dbContext.Areas.Where(x => x.Id == position.AreaId.Value).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken)
            : null;
        var reportsToName = position.ReportsToEmployeeId.HasValue
            ? await dbContext.Employees
                .Where(x => x.Id == position.ReportsToEmployeeId.Value && !x.IsDeleted)
                .Select(x => x.FirstName + " " + x.LastName)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        return new PositionDto(position.Id, position.Code, position.Name, position.IsActive, 0, position.Description, position.Level, position.AreaId, areaName, position.ReportsToEmployeeId, reportsToName);
    }

    public async Task<PositionDto?> UpdateAsync(Guid id, UpdatePositionRequestDto request, CancellationToken cancellationToken = default)
    {
        ValidatePayload(request.Code, request.Name);

        var position = await dbContext.Positions.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (position is null)
        {
            return null;
        }

        await EnsureUniquenessAsync(request.Code, request.Name, id, cancellationToken);

        position.Code = request.Code.Trim().ToUpperInvariant();
        position.Name = request.Name.Trim();
        position.Description = NormalizeOptional(request.Description);
        position.Level = NormalizeOptional(request.Level);
        position.AreaId = request.AreaId;
        position.ReportsToEmployeeId = request.ReportsToEmployeeId;
        position.UpdatedAtUtc = DateTime.UtcNow;
        position.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);

        var employeesCount = await dbContext.Employees.CountAsync(x => x.PositionId == position.Id && !x.IsDeleted, cancellationToken);
        var updatedAreaName = position.AreaId.HasValue
            ? await dbContext.Areas.Where(x => x.Id == position.AreaId.Value).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken)
            : null;
        var updatedReportsToName = position.ReportsToEmployeeId.HasValue
            ? await dbContext.Employees
                .Where(x => x.Id == position.ReportsToEmployeeId.Value && !x.IsDeleted)
                .Select(x => x.FirstName + " " + x.LastName)
                .FirstOrDefaultAsync(cancellationToken)
            : null;
        return new PositionDto(position.Id, position.Code, position.Name, position.IsActive, employeesCount, position.Description, position.Level, position.AreaId, updatedAreaName, position.ReportsToEmployeeId, updatedReportsToName);
    }

    public async Task<bool> UpdateStatusAsync(Guid id, bool isActive, CancellationToken cancellationToken = default)
    {
        var position = await dbContext.Positions.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (position is null)
        {
            return false;
        }

        position.IsActive = isActive;
        position.UpdatedAtUtc = DateTime.UtcNow;
        position.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var position = await dbContext.Positions.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (position is null)
        {
            return false;
        }

        var hasEmployees = await dbContext.Employees.AnyAsync(x => x.PositionId == id && !x.IsDeleted, cancellationToken);
        if (hasEmployees)
        {
            throw new InvalidOperationException("No se puede eliminar un cargo con empleados asignados.");
        }

        position.IsDeleted = true;
        position.IsActive = false;
        position.UpdatedAtUtc = DateTime.UtcNow;
        position.UpdatedBy = "system";

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static IOrderedQueryable<Position> ApplySort(IQueryable<Position> query, string? sortBy, string? sortDirection)
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
            throw new InvalidOperationException("El codigo del cargo es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 2)
        {
            throw new InvalidOperationException("El nombre del cargo es obligatorio.");
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

        var codeExists = await dbContext.Positions.AnyAsync(
            x => x.Code == normalizedCode && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("Ya existe un cargo con ese codigo.");
        }

        var nameExists = await dbContext.Positions.AnyAsync(
            x => x.Name.ToLower() == normalizedName && !x.IsDeleted && (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe un cargo con ese nombre.");
        }
    }
}

