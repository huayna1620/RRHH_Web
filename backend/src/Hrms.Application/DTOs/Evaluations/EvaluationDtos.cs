namespace Hrms.Application.DTOs.Evaluations;

public sealed record EvaluationCycleDto(
    Guid Id,
    string Name,
    string Period,
    int Year,
    DateOnly StartDate,
    DateOnly EndDate,
    string Status,
    int TotalAssignments,
    int CompletedAssignments);

public sealed record CreateEvaluationCycleRequestDto(
    string Name,
    string Period,
    int Year,
    DateOnly StartDate,
    DateOnly EndDate);

public sealed record EvaluationAssignmentDto(
    Guid Id,
    Guid CycleId,
    string CycleName,
    Guid EmployeeId,
    string EmployeeName,
    string EmployeeCode,
    Guid? EvaluatorEmployeeId,
    string? EvaluatorName,
    int? SelfScore,
    string? SelfComments,
    DateTime? SelfCompletedAtUtc,
    int? EvaluatorScore,
    string? EvaluatorComments,
    DateTime? EvaluatorCompletedAtUtc,
    int? FinalScore,
    string? FinalComments,
    string Status);

public sealed record CreateEvaluationAssignmentRequestDto(
    Guid CycleId,
    Guid EmployeeId,
    Guid? EvaluatorEmployeeId);

public sealed record SubmitSelfEvaluationRequestDto(
    int Score,
    string? Comments);

public sealed record SubmitEvaluatorEvaluationRequestDto(
    int Score,
    string? Comments);

public sealed record FinalizeEvaluationRequestDto(
    int FinalScore,
    string? FinalComments);
