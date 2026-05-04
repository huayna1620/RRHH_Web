using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Recruitment;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class RecruitmentService(HrmsDbContext dbContext) : IRecruitmentService
{
    private static readonly IReadOnlyList<RecruitmentStatusOptionDto> StatusOptions =
    [
        new(RecruitmentCandidateStatuses.New, "Nuevo"),
        new(RecruitmentCandidateStatuses.Screening, "Filtro inicial"),
        new(RecruitmentCandidateStatuses.Interview, "Entrevista"),
        new(RecruitmentCandidateStatuses.Offered, "Oferta"),
        new(RecruitmentCandidateStatuses.Hired, "Contratado"),
        new(RecruitmentCandidateStatuses.Rejected, "Descartado")
    ];

    public async Task<PagedResultDto<RecruitmentCandidateListItemDto>> GetPagedAsync(RecruitmentQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var candidatesQuery = dbContext.RecruitmentCandidates
            .AsNoTracking()
            .Include(x => x.JobPosting)
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLowerInvariant();
            candidatesQuery = candidatesQuery.Where(x =>
                x.FullName.ToLower().Contains(search) ||
                x.Email.ToLower().Contains(search) ||
                x.PositionApplied.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = query.Status.Trim().ToLowerInvariant();
            if (!RecruitmentCandidateStatuses.All.Contains(status))
                throw new InvalidOperationException("El estado de postulacion no es valido.");
            candidatesQuery = candidatesQuery.Where(x => x.CurrentStatus == status);
        }

        if (query.IsPotentialHire.HasValue)
            candidatesQuery = candidatesQuery.Where(x => x.IsPotentialHire == query.IsPotentialHire.Value);

        if (query.IsActive.HasValue)
            candidatesQuery = candidatesQuery.Where(x => x.IsActive == query.IsActive.Value);

        if (query.JobPostingId.HasValue)
            candidatesQuery = candidatesQuery.Where(x => x.JobPostingId == query.JobPostingId.Value);

        var totalCount = await candidatesQuery.CountAsync(cancellationToken);

        var items = await candidatesQuery
            .OrderByDescending(x => x.ApplicationDate)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new RecruitmentCandidateListItemDto(
                x.Id, x.FullName, x.Email, x.PhoneNumber, x.PositionApplied,
                x.ExpectedSalary, x.Source, x.CurrentStatus, x.IsPotentialHire,
                x.ApplicationDate, x.NextStepDate, x.IsActive,
                x.JobPostingId, x.JobPosting != null ? x.JobPosting.Title : null,
                x.ConvertedToEmployee))
            .ToListAsync(cancellationToken);

        return new PagedResultDto<RecruitmentCandidateListItemDto>(items, pageNumber, pageSize, totalCount);
    }

    public async Task<RecruitmentCandidateDetailDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var candidate = await dbContext.RecruitmentCandidates
            .AsNoTracking()
            .Include(x => x.JobPosting)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        return candidate is null ? null : ToDetailDto(candidate);
    }

    public Task<RecruitmentCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(new RecruitmentCatalogsDto(StatusOptions));

    public async Task<RecruitmentCandidateDetailDto> CreateAsync(CreateRecruitmentCandidateRequestDto request, string createdBy, CancellationToken cancellationToken = default)
    {
        ValidateCandidatePayload(request.FullName, request.Email, request.PhoneNumber, request.PositionApplied, request.ExpectedSalary, request.CurrentStatus);
        await EnsureUniqueCandidateAsync(request.Email, request.PositionApplied, null, cancellationToken);
        await ValidateJobPostingExistsAsync(request.JobPostingId, cancellationToken);

        var candidate = new RecruitmentCandidate
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PhoneNumber = request.PhoneNumber.Trim(),
            PositionApplied = request.PositionApplied.Trim(),
            ExpectedSalary = request.ExpectedSalary,
            Source = string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim(),
            CurrentStatus = request.CurrentStatus.Trim().ToLowerInvariant(),
            IsPotentialHire = request.IsPotentialHire,
            ApplicationDate = request.ApplicationDate,
            NextStepDate = request.NextStepDate,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            JobPostingId = request.JobPostingId,
            LastStatusChangeAtUtc = DateTime.UtcNow,
            CreatedBy = createdBy,
            UpdatedBy = createdBy
        };

        await dbContext.RecruitmentCandidates.AddAsync(candidate, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (candidate.JobPostingId.HasValue)
        {
            await dbContext.Entry(candidate).Reference(x => x.JobPosting).LoadAsync(cancellationToken);
        }

        return ToDetailDto(candidate);
    }

    public async Task<RecruitmentCandidateDetailDto?> UpdateAsync(Guid id, UpdateRecruitmentCandidateRequestDto request, string updatedBy, CancellationToken cancellationToken = default)
    {
        ValidateCandidatePayload(request.FullName, request.Email, request.PhoneNumber, request.PositionApplied, request.ExpectedSalary, RecruitmentCandidateStatuses.New);

        var candidate = await dbContext.RecruitmentCandidates.Include(x => x.JobPosting)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (candidate is null) return null;

        await EnsureUniqueCandidateAsync(request.Email, request.PositionApplied, id, cancellationToken);
        await ValidateJobPostingExistsAsync(request.JobPostingId, cancellationToken);

        candidate.FullName = request.FullName.Trim();
        candidate.Email = request.Email.Trim().ToLowerInvariant();
        candidate.PhoneNumber = request.PhoneNumber.Trim();
        candidate.PositionApplied = request.PositionApplied.Trim();
        candidate.ExpectedSalary = request.ExpectedSalary;
        candidate.Source = string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim();
        candidate.IsPotentialHire = request.IsPotentialHire;
        candidate.ApplicationDate = request.ApplicationDate;
        candidate.NextStepDate = request.NextStepDate;
        candidate.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        candidate.JobPostingId = request.JobPostingId;
        candidate.UpdatedAtUtc = DateTime.UtcNow;
        candidate.UpdatedBy = updatedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDetailDto(candidate);
    }

    public async Task<RecruitmentCandidateDetailDto?> UpdateStatusAsync(Guid id, UpdateRecruitmentStatusRequestDto request, string changedBy, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Status))
            throw new InvalidOperationException("El estado es obligatorio.");

        var status = request.Status.Trim().ToLowerInvariant();
        if (!RecruitmentCandidateStatuses.All.Contains(status))
            throw new InvalidOperationException("El estado de postulacion no es valido.");

        if (status == RecruitmentCandidateStatuses.Rejected && string.IsNullOrWhiteSpace(request.RejectionReason))
            throw new InvalidOperationException("El motivo de rechazo es obligatorio al descartar un candidato.");

        var candidate = await dbContext.RecruitmentCandidates.Include(x => x.JobPosting)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (candidate is null) return null;

        ValidateStatusTransition(candidate.CurrentStatus, status);

        var history = new CandidateStatusHistory
        {
            CandidateId = candidate.Id,
            FromStatus = candidate.CurrentStatus,
            ToStatus = status,
            ChangedAtUtc = DateTime.UtcNow,
            ChangedBy = changedBy,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            RejectionReason = status == RecruitmentCandidateStatuses.Rejected
                ? request.RejectionReason?.Trim()
                : null
        };
        await dbContext.CandidateStatusHistory.AddAsync(history, cancellationToken);

        candidate.CurrentStatus = status;
        candidate.NextStepDate = request.NextStepDate;
        candidate.IsPotentialHire = request.IsPotentialHire ?? candidate.IsPotentialHire;
        if (!string.IsNullOrWhiteSpace(request.Notes))
            candidate.Notes = request.Notes.Trim();
        if (status == RecruitmentCandidateStatuses.Rejected)
            candidate.RejectionReason = request.RejectionReason?.Trim();

        candidate.LastStatusChangeAtUtc = DateTime.UtcNow;
        candidate.UpdatedAtUtc = DateTime.UtcNow;
        candidate.UpdatedBy = changedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDetailDto(candidate);
    }

    public async Task<bool> DeleteAsync(Guid id, string deletedBy, CancellationToken cancellationToken = default)
    {
        var candidate = await dbContext.RecruitmentCandidates
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (candidate is null) return false;

        candidate.IsDeleted = true;
        candidate.IsActive = false;
        candidate.UpdatedAtUtc = DateTime.UtcNow;
        candidate.UpdatedBy = deletedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<CandidateStatusHistoryDto>> GetStatusHistoryAsync(Guid candidateId, CancellationToken cancellationToken = default)
    {
        return await dbContext.CandidateStatusHistory.AsNoTracking()
            .Where(x => x.CandidateId == candidateId)
            .OrderByDescending(x => x.ChangedAtUtc)
            .Select(x => new CandidateStatusHistoryDto(
                x.Id, x.FromStatus, x.ToStatus, x.ChangedAtUtc, x.ChangedBy, x.Notes, x.RejectionReason))
            .ToListAsync(cancellationToken);
    }

    public async Task<ConvertToEmployeeResultDto> ConvertToEmployeeAsync(Guid candidateId, ConvertToEmployeeRequestDto request, string convertedBy, CancellationToken cancellationToken = default)
    {
        var candidate = await dbContext.RecruitmentCandidates
            .FirstOrDefaultAsync(x => x.Id == candidateId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Candidato no encontrado.");

        if (candidate.CurrentStatus != RecruitmentCandidateStatuses.Hired)
            throw new InvalidOperationException("Solo se pueden convertir candidatos con estado 'Contratado'.");

        if (candidate.ConvertedToEmployee)
            throw new InvalidOperationException("Este candidato ya fue convertido a empleado.");

        if (string.IsNullOrWhiteSpace(request.EmployeeCode))
            throw new InvalidOperationException("El código de empleado es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.DocumentNumber))
            throw new InvalidOperationException("El número de documento es obligatorio.");
        if (request.BaseSalary <= 0)
            throw new InvalidOperationException("El salario base debe ser mayor a cero.");
        if (string.IsNullOrWhiteSpace(request.WorkEmail))
            throw new InvalidOperationException("El correo laboral es obligatorio.");

        if (await dbContext.Employees.AnyAsync(x => x.EmployeeCode == request.EmployeeCode && !x.IsDeleted, cancellationToken))
            throw new InvalidOperationException($"Ya existe un empleado con el código '{request.EmployeeCode}'.");

        var nameParts = candidate.FullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts[0];
        var lastName = nameParts.Length > 1 ? nameParts[1] : nameParts[0];

        var employee = new Employee
        {
            EmployeeCode = request.EmployeeCode.Trim(),
            FirstName = firstName,
            LastName = lastName,
            DocumentType = request.DocumentType.Trim(),
            DocumentNumber = request.DocumentNumber.Trim(),
            BirthDate = request.BirthDate,
            HireDate = request.HireDate,
            BaseSalary = request.BaseSalary,
            PersonalEmail = candidate.Email,
            WorkEmail = request.WorkEmail.Trim().ToLowerInvariant(),
            PhoneNumber = candidate.PhoneNumber,
            BranchId = request.BranchId,
            AreaId = request.AreaId,
            PositionId = request.PositionId,
            ContractTypeId = request.ContractTypeId,
            ManagerId = request.ManagerId,
            Notes = candidate.Notes,
            CreatedBy = convertedBy,
            UpdatedBy = convertedBy
        };

        await dbContext.Employees.AddAsync(employee, cancellationToken);

        candidate.ConvertedToEmployee = true;
        candidate.ConvertedEmployeeId = employee.Id;
        candidate.UpdatedAtUtc = DateTime.UtcNow;
        candidate.UpdatedBy = convertedBy;

        await dbContext.SaveChangesAsync(cancellationToken);

        return new ConvertToEmployeeResultDto(employee.Id, employee.EmployeeCode, candidate.FullName);
    }

    private async Task ValidateJobPostingExistsAsync(Guid? jobPostingId, CancellationToken cancellationToken)
    {
        if (!jobPostingId.HasValue) return;
        var exists = await dbContext.JobPostings.AnyAsync(x => x.Id == jobPostingId.Value && !x.IsDeleted, cancellationToken);
        if (!exists)
            throw new InvalidOperationException("La vacante seleccionada no existe.");
    }

    private static void ValidateCandidatePayload(string fullName, string email, string phoneNumber, string positionApplied, decimal? expectedSalary, string status)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new InvalidOperationException("El nombre del postulante es obligatorio.");
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new InvalidOperationException("El correo del postulante no es valido.");
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new InvalidOperationException("El telefono es obligatorio.");
        if (string.IsNullOrWhiteSpace(positionApplied))
            throw new InvalidOperationException("El puesto postulado es obligatorio.");
        if (expectedSalary.HasValue && expectedSalary.Value < 0)
            throw new InvalidOperationException("La expectativa salarial no puede ser negativa.");
        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            if (!RecruitmentCandidateStatuses.All.Contains(normalizedStatus))
                throw new InvalidOperationException("El estado de postulacion no es valido.");
        }
    }

    private async Task EnsureUniqueCandidateAsync(string email, string positionApplied, Guid? currentId, CancellationToken cancellationToken)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedPosition = positionApplied.Trim().ToLowerInvariant();
        var exists = await dbContext.RecruitmentCandidates.AnyAsync(
            x => !x.IsDeleted &&
                x.Email == normalizedEmail &&
                x.PositionApplied.ToLower() == normalizedPosition &&
                (!currentId.HasValue || x.Id != currentId.Value),
            cancellationToken);

        if (exists)
            throw new InvalidOperationException("Ya existe un postulante con el mismo correo para ese puesto.");
    }

    private static readonly IReadOnlyDictionary<string, IReadOnlySet<string>> ValidTransitions =
        new Dictionary<string, IReadOnlySet<string>>(StringComparer.OrdinalIgnoreCase)
        {
            [RecruitmentCandidateStatuses.New] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { RecruitmentCandidateStatuses.Screening, RecruitmentCandidateStatuses.Rejected },
            [RecruitmentCandidateStatuses.Screening] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { RecruitmentCandidateStatuses.Interview, RecruitmentCandidateStatuses.Rejected },
            [RecruitmentCandidateStatuses.Interview] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { RecruitmentCandidateStatuses.Offered, RecruitmentCandidateStatuses.Rejected },
            [RecruitmentCandidateStatuses.Offered] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { RecruitmentCandidateStatuses.Hired, RecruitmentCandidateStatuses.Rejected },
            [RecruitmentCandidateStatuses.Hired] = new HashSet<string>(StringComparer.OrdinalIgnoreCase),
            [RecruitmentCandidateStatuses.Rejected] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        };

    private static void ValidateStatusTransition(string currentStatus, string newStatus)
    {
        if (string.Equals(currentStatus, newStatus, StringComparison.OrdinalIgnoreCase)) return;
        if (!ValidTransitions.TryGetValue(currentStatus, out var allowed) || !allowed.Contains(newStatus))
            throw new InvalidOperationException($"No se puede cambiar el estado de '{currentStatus}' a '{newStatus}'.");
    }

    private static RecruitmentCandidateDetailDto ToDetailDto(RecruitmentCandidate c) =>
        new(c.Id, c.FullName, c.Email, c.PhoneNumber, c.PositionApplied,
            c.ExpectedSalary, c.Source, c.CurrentStatus, c.IsPotentialHire,
            c.ApplicationDate, c.NextStepDate, c.Notes, c.LastStatusChangeAtUtc, c.IsActive,
            c.JobPostingId, c.JobPosting?.Title, c.RejectionReason,
            c.ConvertedToEmployee, c.ConvertedEmployeeId);
}
