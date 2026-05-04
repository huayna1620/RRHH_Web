using Hrms.Application.DTOs.Onboarding;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class OnboardingService(HrmsDbContext dbContext, IIntegrationService integrationService) : IOnboardingService
{
    public async Task<IReadOnlyList<OnboardingTemplateDto>> GetTemplatesAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.OnboardingTemplates
            .AsNoTracking()
            .Where(t => !t.IsDeleted)
            .Include(t => t.Tasks.OrderBy(x => x.SortOrder))
            .OrderByDescending(t => t.CreatedAtUtc)
            .Select(t => new OnboardingTemplateDto(
                t.Id, t.Name, t.Description, t.IsActive,
                t.Tasks.Select(x => new OnboardingTemplateTaskDto(x.Id, x.Title, x.Description, x.SortOrder)).ToList()))
            .ToListAsync(cancellationToken);
    }

    public async Task<OnboardingTemplateDto> CreateTemplateAsync(CreateOnboardingTemplateRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new InvalidOperationException("El nombre de la plantilla es obligatorio.");

        var template = new OnboardingTemplate
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CreatedBy = userName,
            UpdatedBy = userName,
            Tasks = request.Tasks.Select(t => new OnboardingTemplateTask
            {
                Title = t.Title.Trim(),
                Description = t.Description?.Trim(),
                SortOrder = t.SortOrder
            }).ToList()
        };

        dbContext.OnboardingTemplates.Add(template);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new OnboardingTemplateDto(
            template.Id, template.Name, template.Description, template.IsActive,
            template.Tasks.OrderBy(t => t.SortOrder)
                .Select(t => new OnboardingTemplateTaskDto(t.Id, t.Title, t.Description, t.SortOrder))
                .ToList());
    }

    public async Task<bool> DeleteTemplateAsync(Guid templateId, CancellationToken cancellationToken = default)
    {
        var template = await dbContext.OnboardingTemplates
            .FirstOrDefaultAsync(t => t.Id == templateId && !t.IsDeleted, cancellationToken);
        if (template is null) return false;

        template.IsDeleted = true;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<OnboardingProcessDto>> GetProcessesAsync(Guid? employeeId, CancellationToken cancellationToken = default)
    {
        var query = dbContext.OnboardingProcesses
            .AsNoTracking()
            .Where(p => !p.IsDeleted)
            .Include(p => p.Employee)
            .Include(p => p.Template)
            .Include(p => p.Tasks.OrderBy(t => t.SortOrder))
            .AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(p => p.EmployeeId == employeeId.Value);

        return await query
            .OrderByDescending(p => p.StartedAtUtc)
            .Select(p => ToProcessDto(p))
            .ToListAsync(cancellationToken);
    }

    public async Task<OnboardingProcessDto?> GetProcessAsync(Guid processId, CancellationToken cancellationToken = default)
    {
        var process = await dbContext.OnboardingProcesses
            .AsNoTracking()
            .Where(p => p.Id == processId && !p.IsDeleted)
            .Include(p => p.Employee)
            .Include(p => p.Template)
            .Include(p => p.Tasks.OrderBy(t => t.SortOrder))
            .FirstOrDefaultAsync(cancellationToken);

        return process is null ? null : ToProcessDto(process);
    }

    public async Task<OnboardingProcessDto> StartProcessAsync(StartOnboardingRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        var template = await dbContext.OnboardingTemplates
            .Include(t => t.Tasks.OrderBy(x => x.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == request.TemplateId && !t.IsDeleted && t.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("La plantilla no existe o no está activa.");

        var employee = await dbContext.Employees
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && !e.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("El empleado no existe.");

        var process = new OnboardingProcess
        {
            EmployeeId = request.EmployeeId,
            TemplateId = request.TemplateId,
            CreatedBy = userName,
            UpdatedBy = userName,
            Tasks = template.Tasks.Select(t => new OnboardingTask
            {
                Title = t.Title,
                Description = t.Description,
                SortOrder = t.SortOrder
            }).ToList()
        };

        dbContext.OnboardingProcesses.Add(process);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Reload with navigations
        await dbContext.Entry(process).Reference(p => p.Employee).LoadAsync(cancellationToken);
        await dbContext.Entry(process).Reference(p => p.Template).LoadAsync(cancellationToken);

        return ToProcessDto(process);
    }

    public async Task<bool> CompleteTaskAsync(Guid processId, Guid taskId, string userName, CancellationToken cancellationToken = default)
    {
        var task = await dbContext.OnboardingTasks
            .Include(t => t.Process).ThenInclude(p => p.Tasks)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.ProcessId == processId, cancellationToken);

        if (task is null || task.IsCompleted) return false;

        task.IsCompleted = true;
        task.CompletedAtUtc = DateTime.UtcNow;
        task.CompletedByUserName = userName;

        // Check if all tasks are done
        var allDone = task.Process.Tasks.All(t => t.Id == taskId || t.IsCompleted);
        if (allDone)
        {
            task.Process.CompletedAtUtc = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        if (allDone)
        {
            // Recargar Employee + Template para el payload
            await dbContext.Entry(task.Process).Reference(p => p.Employee).LoadAsync(cancellationToken);
            await dbContext.Entry(task.Process).Reference(p => p.Template).LoadAsync(cancellationToken);

            await integrationService.DispatchEventAsync("onboarding.completed", new
            {
                processId = task.Process.Id,
                employeeId = task.Process.EmployeeId,
                employeeName = $"{task.Process.Employee.FirstName} {task.Process.Employee.LastName}",
                templateName = task.Process.Template.Name,
                completedAtUtc = task.Process.CompletedAtUtc
            }, cancellationToken);
        }

        return true;
    }

    private static OnboardingProcessDto ToProcessDto(OnboardingProcess p)
    {
        var total = p.Tasks.Count;
        var completed = p.Tasks.Count(t => t.IsCompleted);
        return new OnboardingProcessDto(
            p.Id, p.EmployeeId,
            p.Employee.FirstName + " " + p.Employee.LastName,
            p.Employee.EmployeeCode,
            p.Template.Name,
            p.StartedAtUtc, p.CompletedAtUtc,
            total, completed,
            total > 0 ? Math.Round(completed * 100.0 / total, 1) : 0,
            p.Tasks.OrderBy(t => t.SortOrder).Select(t => new OnboardingTaskDto(
                t.Id, t.Title, t.Description, t.SortOrder,
                t.IsCompleted, t.CompletedAtUtc, t.CompletedByUserName)).ToList());
    }
}
