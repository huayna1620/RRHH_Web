using Hrms.Application.DTOs.Evaluations;

namespace Hrms.Application.Interfaces.Services;

public interface IEvaluationService
{
    // Cycles
    Task<IReadOnlyList<EvaluationCycleDto>> GetCyclesAsync(CancellationToken cancellationToken = default);
    Task<EvaluationCycleDto> CreateCycleAsync(CreateEvaluationCycleRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<bool> ActivateCycleAsync(Guid cycleId, CancellationToken cancellationToken = default);
    Task<bool> CloseCycleAsync(Guid cycleId, CancellationToken cancellationToken = default);

    // Assignments
    Task<IReadOnlyList<EvaluationAssignmentDto>> GetAssignmentsAsync(Guid? cycleId, Guid? employeeId, CancellationToken cancellationToken = default);
    Task<EvaluationAssignmentDto> CreateAssignmentAsync(CreateEvaluationAssignmentRequestDto request, string userName, CancellationToken cancellationToken = default);
    Task<EvaluationAssignmentDto?> SubmitSelfEvaluationAsync(Guid assignmentId, SubmitSelfEvaluationRequestDto request, Guid userId, CancellationToken cancellationToken = default);
    Task<EvaluationAssignmentDto?> SubmitEvaluatorEvaluationAsync(Guid assignmentId, SubmitEvaluatorEvaluationRequestDto request, Guid userId, CancellationToken cancellationToken = default);
    Task<EvaluationAssignmentDto?> FinalizeAsync(Guid assignmentId, FinalizeEvaluationRequestDto request, string userName, CancellationToken cancellationToken = default);

    // My evaluations (for employee portal)
    Task<IReadOnlyList<EvaluationAssignmentDto>> GetMyEvaluationsAsync(Guid userId, CancellationToken cancellationToken = default);
}
