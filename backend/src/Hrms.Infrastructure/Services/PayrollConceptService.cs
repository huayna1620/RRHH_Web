using Hrms.Application.DTOs.Payroll;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class PayrollConceptService(HrmsDbContext dbContext) : IPayrollConceptService
{
    public async Task<IReadOnlyList<PayrollConceptDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var concepts = await dbContext.PayrollConcepts
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Type)
            .ThenBy(x => x.Name)
            .Select(x => ToDto(x))
            .ToListAsync(cancellationToken);

        return concepts;
    }

    public async Task<PayrollConceptDto> CreateAsync(CreatePayrollConceptRequestDto request, string createdBy, CancellationToken cancellationToken = default)
    {
        ValidateRequest(request.Type, request.FixedAmount, request.Percentage);

        if (await dbContext.PayrollConcepts.AnyAsync(x => x.Code == request.Code.Trim().ToUpperInvariant() && !x.IsDeleted, cancellationToken))
            throw new InvalidOperationException($"Ya existe un concepto con el código '{request.Code}'.");

        var concept = new PayrollConcept
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            Type = request.Type.Trim().ToLowerInvariant(),
            FixedAmount = request.FixedAmount,
            Percentage = request.Percentage,
            IsAutomatic = request.IsAutomatic,
            Description = request.Description?.Trim(),
            CreatedBy = createdBy,
            UpdatedBy = createdBy
        };

        await dbContext.PayrollConcepts.AddAsync(concept, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(concept);
    }

    public async Task<PayrollConceptDto> UpdateAsync(Guid id, UpdatePayrollConceptRequestDto request, string updatedBy, CancellationToken cancellationToken = default)
    {
        ValidateRequest(request.Type, request.FixedAmount, request.Percentage);

        var concept = await dbContext.PayrollConcepts
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Concepto de planilla no encontrado.");

        concept.Name = request.Name.Trim();
        concept.Type = request.Type.Trim().ToLowerInvariant();
        concept.FixedAmount = request.FixedAmount;
        concept.Percentage = request.Percentage;
        concept.IsAutomatic = request.IsAutomatic;
        concept.IsActive = request.IsActive;
        concept.Description = request.Description?.Trim();
        concept.UpdatedAtUtc = DateTime.UtcNow;
        concept.UpdatedBy = updatedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(concept);
    }

    public async Task<bool> DeleteAsync(Guid id, string deletedBy, CancellationToken cancellationToken = default)
    {
        var concept = await dbContext.PayrollConcepts
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (concept is null) return false;

        concept.IsDeleted = true;
        concept.UpdatedAtUtc = DateTime.UtcNow;
        concept.UpdatedBy = deletedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ValidateRequest(string type, decimal? fixedAmount, decimal? percentage)
    {
        if (!PayrollConceptTypes.All.Contains(type.Trim().ToLowerInvariant()))
            throw new InvalidOperationException($"Tipo de concepto invalido. Use: {string.Join(", ", PayrollConceptTypes.All)}");

        if (fixedAmount is null && percentage is null)
            throw new InvalidOperationException("Debe especificar monto fijo o porcentaje.");

        if (fixedAmount is not null && percentage is not null)
            throw new InvalidOperationException("Solo puede especificar monto fijo o porcentaje, no ambos.");

        if (fixedAmount is not null && fixedAmount < 0)
            throw new InvalidOperationException("El monto fijo no puede ser negativo.");

        if (percentage is not null && (percentage < 0 || percentage > 100))
            throw new InvalidOperationException("El porcentaje debe estar entre 0 y 100.");
    }

    private static PayrollConceptDto ToDto(PayrollConcept x) =>
        new(x.Id, x.Code, x.Name, x.Type, x.FixedAmount, x.Percentage, x.IsAutomatic, x.IsActive, x.Description);
}
