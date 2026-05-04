using Hrms.Application.DTOs.Evaluations;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class EvaluationService(HrmsDbContext dbContext, IIntegrationService integrationService) : IEvaluationService
{
    // ── Cycles ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<EvaluationCycleDto>> GetCyclesAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.EvaluationCycles
            .AsNoTracking()
            .Where(c => !c.IsDeleted)
            .Include(c => c.Assignments)
            .OrderByDescending(c => c.Year).ThenByDescending(c => c.StartDate)
            .Select(c => new EvaluationCycleDto(
                c.Id, c.Name, c.Period, c.Year, c.StartDate, c.EndDate, c.Status,
                c.Assignments.Count,
                c.Assignments.Count(a => a.Status == "finalized")))
            .ToListAsync(cancellationToken);
    }

    public async Task<EvaluationCycleDto> CreateCycleAsync(CreateEvaluationCycleRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("El nombre del ciclo es obligatorio.");

        var cycle = new EvaluationCycle
        {
            Name = request.Name.Trim(),
            Period = request.Period,
            Year = request.Year,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = "draft",
            CreatedBy = userName,
            UpdatedBy = userName
        };

        dbContext.EvaluationCycles.Add(cycle);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new EvaluationCycleDto(cycle.Id, cycle.Name, cycle.Period, cycle.Year,
            cycle.StartDate, cycle.EndDate, cycle.Status, 0, 0);
    }

    public async Task<bool> ActivateCycleAsync(Guid cycleId, CancellationToken cancellationToken = default)
    {
        var cycle = await dbContext.EvaluationCycles
            .FirstOrDefaultAsync(c => c.Id == cycleId && !c.IsDeleted, cancellationToken);
        if (cycle is null || cycle.Status != "draft") return false;

        cycle.Status = "active";
        cycle.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> CloseCycleAsync(Guid cycleId, CancellationToken cancellationToken = default)
    {
        var cycle = await dbContext.EvaluationCycles
            .FirstOrDefaultAsync(c => c.Id == cycleId && !c.IsDeleted, cancellationToken);
        if (cycle is null || cycle.Status != "active") return false;

        cycle.Status = "closed";
        cycle.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    // ── Assignments ──────────────────────────────────────────────────────

    public async Task<IReadOnlyList<EvaluationAssignmentDto>> GetAssignmentsAsync(Guid? cycleId, Guid? employeeId, CancellationToken cancellationToken = default)
    {
        var query = dbContext.EvaluationAssignments
            .AsNoTracking()
            .Where(a => !a.IsDeleted)
            .Include(a => a.Cycle)
            .Include(a => a.Employee)
            .Include(a => a.Evaluator)
            .AsQueryable();

        if (cycleId.HasValue) query = query.Where(a => a.CycleId == cycleId.Value);
        if (employeeId.HasValue) query = query.Where(a => a.EmployeeId == employeeId.Value);

        return await query
            .OrderBy(a => a.Employee.LastName).ThenBy(a => a.Employee.FirstName)
            .Select(a => ToAssignmentDto(a))
            .ToListAsync(cancellationToken);
    }

    public async Task<EvaluationAssignmentDto> CreateAssignmentAsync(CreateEvaluationAssignmentRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var cycle = await dbContext.EvaluationCycles
            .FirstOrDefaultAsync(c => c.Id == request.CycleId && !c.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("El ciclo de evaluación no existe.");

        if (cycle.Status == "closed")
            throw new InvalidOperationException("El ciclo ya está cerrado.");

        var exists = await dbContext.EvaluationAssignments
            .AnyAsync(a => a.CycleId == request.CycleId && a.EmployeeId == request.EmployeeId && !a.IsDeleted, cancellationToken);
        if (exists)
            throw new InvalidOperationException("El empleado ya tiene una asignación en este ciclo.");

        var assignment = new EvaluationAssignment
        {
            CycleId = request.CycleId,
            EmployeeId = request.EmployeeId,
            EvaluatorEmployeeId = request.EvaluatorEmployeeId,
            CreatedBy = userName,
            UpdatedBy = userName
        };

        dbContext.EvaluationAssignments.Add(assignment);
        await dbContext.SaveChangesAsync(cancellationToken);

        await dbContext.Entry(assignment).Reference(a => a.Cycle).LoadAsync(cancellationToken);
        await dbContext.Entry(assignment).Reference(a => a.Employee).LoadAsync(cancellationToken);
        if (assignment.EvaluatorEmployeeId.HasValue)
            await dbContext.Entry(assignment).Reference(a => a.Evaluator).LoadAsync(cancellationToken);

        return ToAssignmentDto(assignment);
    }

    public async Task<EvaluationAssignmentDto?> SubmitSelfEvaluationAsync(Guid assignmentId, SubmitSelfEvaluationRequestDto request, Guid userId, CancellationToken cancellationToken = default)
    {
        var assignment = await LoadAssignment(assignmentId, cancellationToken);
        if (assignment is null) return null;

        // Verify the user is the employee
        var user = await dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user?.EmployeeId != assignment.EmployeeId)
            throw new InvalidOperationException("Solo el empleado asignado puede completar su auto-evaluación.");

        if (assignment.SelfCompletedAtUtc.HasValue)
            throw new InvalidOperationException("La auto-evaluación ya fue completada.");

        if (request.Score < 1 || request.Score > 5)
            throw new InvalidOperationException("El puntaje debe estar entre 1 y 5.");

        assignment.SelfScore = request.Score;
        assignment.SelfComments = request.Comments?.Trim();
        assignment.SelfCompletedAtUtc = DateTime.UtcNow;
        assignment.Status = "self_completed";
        assignment.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToAssignmentDto(assignment);
    }

    public async Task<EvaluationAssignmentDto?> SubmitEvaluatorEvaluationAsync(Guid assignmentId, SubmitEvaluatorEvaluationRequestDto request, Guid userId, CancellationToken cancellationToken = default)
    {
        var assignment = await LoadAssignment(assignmentId, cancellationToken);
        if (assignment is null) return null;

        // Verify the user is the evaluator
        var user = await dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user?.EmployeeId != assignment.EvaluatorEmployeeId)
            throw new InvalidOperationException("Solo el evaluador asignado puede completar esta evaluación.");

        if (assignment.EvaluatorCompletedAtUtc.HasValue)
            throw new InvalidOperationException("La evaluación del jefe ya fue completada.");

        if (request.Score < 1 || request.Score > 5)
            throw new InvalidOperationException("El puntaje debe estar entre 1 y 5.");

        assignment.EvaluatorScore = request.Score;
        assignment.EvaluatorComments = request.Comments?.Trim();
        assignment.EvaluatorCompletedAtUtc = DateTime.UtcNow;
        assignment.Status = "evaluator_completed";
        assignment.UpdatedAtUtc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToAssignmentDto(assignment);
    }

    public async Task<EvaluationAssignmentDto?> FinalizeAsync(Guid assignmentId, FinalizeEvaluationRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var assignment = await LoadAssignment(assignmentId, cancellationToken);
        if (assignment is null) return null;

        if (request.FinalScore < 1 || request.FinalScore > 5)
            throw new InvalidOperationException("El puntaje final debe estar entre 1 y 5.");

        assignment.FinalScore = request.FinalScore;
        assignment.FinalComments = request.FinalComments?.Trim();
        assignment.Status = "finalized";
        assignment.UpdatedAtUtc = DateTime.UtcNow;
        assignment.UpdatedBy = userName;

        await dbContext.SaveChangesAsync(cancellationToken);

        await integrationService.DispatchEventAsync("evaluation.finalized", new
        {
            assignmentId = assignment.Id,
            cycleId = assignment.CycleId,
            cycleName = assignment.Cycle.Name,
            employeeId = assignment.EmployeeId,
            employeeName = $"{assignment.Employee.FirstName} {assignment.Employee.LastName}",
            finalScore = assignment.FinalScore,
            finalizedBy = userName
        }, cancellationToken);

        return ToAssignmentDto(assignment);
    }

    public async Task<IReadOnlyList<EvaluationAssignmentDto>> GetMyEvaluationsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user?.EmployeeId is null) return [];

        return await dbContext.EvaluationAssignments
            .AsNoTracking()
            .Where(a => !a.IsDeleted && a.EmployeeId == user.EmployeeId.Value)
            .Include(a => a.Cycle)
            .Include(a => a.Employee)
            .Include(a => a.Evaluator)
            .OrderByDescending(a => a.Cycle.Year).ThenByDescending(a => a.Cycle.StartDate)
            .Select(a => ToAssignmentDto(a))
            .ToListAsync(cancellationToken);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private async Task<EvaluationAssignment?> LoadAssignment(Guid id, CancellationToken ct)
    {
        return await dbContext.EvaluationAssignments
            .Include(a => a.Cycle)
            .Include(a => a.Employee)
            .Include(a => a.Evaluator)
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, ct);
    }

    private static EvaluationAssignmentDto ToAssignmentDto(EvaluationAssignment a)
    {
        return new EvaluationAssignmentDto(
            a.Id, a.CycleId, a.Cycle.Name,
            a.EmployeeId,
            a.Employee.FirstName + " " + a.Employee.LastName,
            a.Employee.EmployeeCode,
            a.EvaluatorEmployeeId,
            a.Evaluator is not null ? a.Evaluator.FirstName + " " + a.Evaluator.LastName : null,
            a.SelfScore, a.SelfComments, a.SelfCompletedAtUtc,
            a.EvaluatorScore, a.EvaluatorComments, a.EvaluatorCompletedAtUtc,
            a.FinalScore, a.FinalComments, a.Status);
    }
}
