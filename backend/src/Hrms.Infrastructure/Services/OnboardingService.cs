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
                t.Id, t.Name, t.Description, t.IsActive, t.CreatedAtUtc,
                t.Tasks.Select(x => new OnboardingTemplateTaskDto(x.Id, x.Title, x.Description, x.SortOrder)).ToList()))
            .ToListAsync(cancellationToken);
    }

    public async Task<OnboardingTemplateDto> CreateTemplateAsync(CreateOnboardingTemplateRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        ValidateTemplatePayload(request.Name, request.Description, request.Tasks);
        await EnsureTemplateNameAsync(request.Name, null, cancellationToken);

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
            template.Id, template.Name, template.Description, template.IsActive, template.CreatedAtUtc,
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

    public async Task<OnboardingTemplateDto?> UpdateTemplateAsync(Guid templateId, UpdateOnboardingTemplateRequestDto request, string userName, CancellationToken cancellationToken = default)
    {
        ValidateTemplatePayload(request.Name, request.Description, request.Tasks);

        var template = await dbContext.OnboardingTemplates
            .Include(t => t.Tasks)
            .FirstOrDefaultAsync(t => t.Id == templateId && !t.IsDeleted, cancellationToken);
        if (template is null) return null;

        await EnsureTemplateNameAsync(request.Name, templateId, cancellationToken);

        template.Name = request.Name.Trim();
        template.Description = request.Description?.Trim();
        template.UpdatedAtUtc = DateTime.UtcNow;
        template.UpdatedBy = userName;

        dbContext.OnboardingTemplateTasks.RemoveRange(template.Tasks);
        template.Tasks = request.Tasks.Select((t, index) => new OnboardingTemplateTask
        {
            Title = t.Title.Trim(),
            Description = t.Description?.Trim(),
            SortOrder = t.SortOrder <= 0 ? index + 1 : t.SortOrder
        }).ToList();

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToTemplateDto(template);
    }

    public async Task<OnboardingTemplateDto?> DuplicateTemplateAsync(Guid templateId, string userName, CancellationToken cancellationToken = default)
    {
        var template = await dbContext.OnboardingTemplates
            .AsNoTracking()
            .Include(t => t.Tasks.OrderBy(x => x.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == templateId && !t.IsDeleted, cancellationToken);
        if (template is null) return null;

        var baseName = $"{template.Name} (copia)";
        var name = baseName;
        var counter = 2;
        while (await dbContext.OnboardingTemplates.AnyAsync(t => !t.IsDeleted && t.Name.ToLower() == name.ToLower(), cancellationToken))
        {
            name = $"{baseName} {counter++}";
        }

        var copy = new OnboardingTemplate
        {
            Name = name,
            Description = template.Description,
            CreatedBy = userName,
            UpdatedBy = userName,
            Tasks = template.Tasks.Select(t => new OnboardingTemplateTask
            {
                Title = t.Title,
                Description = t.Description,
                SortOrder = t.SortOrder
            }).ToList()
        };

        dbContext.OnboardingTemplates.Add(copy);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToTemplateDto(copy);
    }

    public async Task<bool> UpdateTemplateStatusAsync(Guid templateId, bool isActive, string userName, CancellationToken cancellationToken = default)
    {
        var template = await dbContext.OnboardingTemplates.FirstOrDefaultAsync(t => t.Id == templateId && !t.IsDeleted, cancellationToken);
        if (template is null) return false;

        template.IsActive = isActive;
        template.UpdatedAtUtc = DateTime.UtcNow;
        template.UpdatedBy = userName;

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

    public async Task<bool> CompleteProcessAsync(Guid processId, string userName, CancellationToken cancellationToken = default)
    {
        var process = await dbContext.OnboardingProcesses
            .Include(p => p.Tasks)
            .FirstOrDefaultAsync(p => p.Id == processId && !p.IsDeleted && p.IsActive, cancellationToken);
        if (process is null || process.CompletedAtUtc.HasValue) return false;

        foreach (var task in process.Tasks.Where(t => !t.IsCompleted))
        {
            task.IsCompleted = true;
            task.CompletedAtUtc = DateTime.UtcNow;
            task.CompletedByUserName = userName;
        }

        process.CompletedAtUtc = DateTime.UtcNow;
        process.UpdatedAtUtc = DateTime.UtcNow;
        process.UpdatedBy = userName;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> CancelProcessAsync(Guid processId, string userName, CancellationToken cancellationToken = default)
    {
        var process = await dbContext.OnboardingProcesses.FirstOrDefaultAsync(p => p.Id == processId && !p.IsDeleted && p.IsActive, cancellationToken);
        if (process is null || process.CompletedAtUtc.HasValue) return false;

        process.IsActive = false;
        process.UpdatedAtUtc = DateTime.UtcNow;
        process.UpdatedBy = userName;

        await dbContext.SaveChangesAsync(cancellationToken);
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
            p.StartedAtUtc, p.CompletedAtUtc, p.IsActive,
            total, completed,
            total > 0 ? Math.Round(completed * 100.0 / total, 1) : 0,
            p.Tasks.OrderBy(t => t.SortOrder).Select(t => new OnboardingTaskDto(
                t.Id, t.Title, t.Description, t.SortOrder,
                t.IsCompleted, t.CompletedAtUtc, t.CompletedByUserName)).ToList());
    }

    private static OnboardingTemplateDto ToTemplateDto(OnboardingTemplate template)
    {
        return new OnboardingTemplateDto(
            template.Id, template.Name, template.Description, template.IsActive, template.CreatedAtUtc,
            template.Tasks.OrderBy(t => t.SortOrder)
                .Select(t => new OnboardingTemplateTaskDto(t.Id, t.Title, t.Description, t.SortOrder))
                .ToList());
    }

    private static void ValidateTemplatePayload(string name, string? description, IReadOnlyList<CreateTemplateTaskItemDto> tasks)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 3)
            throw new InvalidOperationException("El nombre de la plantilla es obligatorio.");

        if (string.IsNullOrWhiteSpace(description) || description.Trim().Length < 10)
            throw new InvalidOperationException("La descripción debe tener al menos 10 caracteres.");

        if (tasks.Count == 0)
            throw new InvalidOperationException("Agrega al menos una tarea.");

        if (tasks.Any(t => string.IsNullOrWhiteSpace(t.Title) || t.Title.Trim().Length < 3))
            throw new InvalidOperationException("Cada tarea debe tener un nombre válido.");
    }

    private async Task EnsureTemplateNameAsync(string name, Guid? currentId, CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim().ToLower();
        var exists = await dbContext.OnboardingTemplates.AnyAsync(
            t => !t.IsDeleted && t.Name.ToLower() == normalizedName && (!currentId.HasValue || t.Id != currentId.Value),
            cancellationToken);

        if (exists)
            throw new InvalidOperationException("Ya existe una plantilla con ese nombre.");
    }
}
