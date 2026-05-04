using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.JobPostings;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class JobPostingService(HrmsDbContext dbContext) : IJobPostingService
{
    public async Task<PagedResultDto<JobPostingDto>> GetPagedAsync(JobPostingQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var q = dbContext.JobPostings.AsNoTracking().Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLowerInvariant();
            q = q.Where(x => x.Title.ToLower().Contains(s) ||
                (x.AreaName != null && x.AreaName.ToLower().Contains(s)) ||
                (x.PositionName != null && x.PositionName.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(x => x.Status == query.Status.Trim().ToLowerInvariant());

        var totalCount = await q.CountAsync(cancellationToken);

        var items = await q
            .OrderByDescending(x => x.OpenedDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new JobPostingDto(
                x.Id, x.Title, x.Description, x.AreaName, x.PositionName,
                x.Status, x.OpenedDate, x.ClosedDate, x.RequiredCount, x.Notes,
                x.Candidates.Count(c => !c.IsDeleted),
                x.IsActive))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<JobPostingDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<JobPostingDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var posting = await dbContext.JobPostings.AsNoTracking()
            .Include(x => x.Candidates)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        return posting is null ? null : ToDto(posting);
    }

    public async Task<IReadOnlyList<JobPostingDto>> GetOpenAsync(CancellationToken cancellationToken = default)
    {
        var items = await dbContext.JobPostings.AsNoTracking()
            .Include(x => x.Candidates)
            .Where(x => !x.IsDeleted && x.Status == JobPostingStatuses.Open)
            .OrderBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return items.Select(ToDto).ToList();
    }

    public async Task<JobPostingDto> CreateAsync(CreateJobPostingRequestDto request, string createdBy, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidOperationException("El título de la vacante es obligatorio.");
        if (request.RequiredCount < 1)
            throw new InvalidOperationException("El número de vacantes debe ser al menos 1.");

        var posting = new JobPosting
        {
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            AreaName = string.IsNullOrWhiteSpace(request.AreaName) ? null : request.AreaName.Trim(),
            PositionName = string.IsNullOrWhiteSpace(request.PositionName) ? null : request.PositionName.Trim(),
            Status = JobPostingStatuses.Open,
            OpenedDate = request.OpenedDate,
            RequiredCount = request.RequiredCount,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedBy = createdBy,
            UpdatedBy = createdBy
        };

        await dbContext.JobPostings.AddAsync(posting, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(posting);
    }

    public async Task<JobPostingDto?> UpdateAsync(Guid id, UpdateJobPostingRequestDto request, string updatedBy, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new InvalidOperationException("El título de la vacante es obligatorio.");
        if (request.RequiredCount < 1)
            throw new InvalidOperationException("El número de vacantes debe ser al menos 1.");
        if (!JobPostingStatuses.All.Contains(request.Status.Trim().ToLowerInvariant()))
            throw new InvalidOperationException("Estado de vacante no válido.");

        var posting = await dbContext.JobPostings.Include(x => x.Candidates)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (posting is null) return null;

        posting.Title = request.Title.Trim();
        posting.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        posting.AreaName = string.IsNullOrWhiteSpace(request.AreaName) ? null : request.AreaName.Trim();
        posting.PositionName = string.IsNullOrWhiteSpace(request.PositionName) ? null : request.PositionName.Trim();
        posting.Status = request.Status.Trim().ToLowerInvariant();
        posting.OpenedDate = request.OpenedDate;
        posting.ClosedDate = request.ClosedDate;
        posting.RequiredCount = request.RequiredCount;
        posting.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        posting.UpdatedAtUtc = DateTime.UtcNow;
        posting.UpdatedBy = updatedBy;

        if (posting.Status == JobPostingStatuses.Closed && posting.ClosedDate is null)
            posting.ClosedDate = DateOnly.FromDateTime(DateTime.UtcNow);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(posting);
    }

    public async Task<bool> CloseAsync(Guid id, string updatedBy, CancellationToken cancellationToken = default)
    {
        var posting = await dbContext.JobPostings
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (posting is null) return false;

        posting.Status = JobPostingStatuses.Closed;
        posting.ClosedDate ??= DateOnly.FromDateTime(DateTime.UtcNow);
        posting.UpdatedAtUtc = DateTime.UtcNow;
        posting.UpdatedBy = updatedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, string deletedBy, CancellationToken cancellationToken = default)
    {
        var posting = await dbContext.JobPostings
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (posting is null) return false;

        posting.IsDeleted = true;
        posting.IsActive = false;
        posting.UpdatedAtUtc = DateTime.UtcNow;
        posting.UpdatedBy = deletedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static JobPostingDto ToDto(JobPosting x) =>
        new(x.Id, x.Title, x.Description, x.AreaName, x.PositionName,
            x.Status, x.OpenedDate, x.ClosedDate, x.RequiredCount, x.Notes,
            x.Candidates.Count(c => !c.IsDeleted), x.IsActive);
}
