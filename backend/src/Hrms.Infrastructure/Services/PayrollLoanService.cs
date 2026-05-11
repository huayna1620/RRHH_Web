using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Payroll;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class PayrollLoanService(HrmsDbContext dbContext) : IPayrollLoanService
{
    public async Task<PagedResultDto<PayrollLoanDto>> GetPagedAsync(
        Guid? employeeId, bool? activeOnly, int pageNumber, int pageSize,
        CancellationToken cancellationToken = default)
    {
        pageNumber = pageNumber <= 0 ? 1 : pageNumber;
        pageSize = pageSize <= 0 ? 20 : Math.Min(pageSize, 100);

        var q = dbContext.PayrollLoans
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.Installments)
            .Where(x => !x.IsDeleted);

        if (employeeId.HasValue)
            q = q.Where(x => x.EmployeeId == employeeId.Value);

        if (activeOnly == true)
            q = q.Where(x => x.IsActive && x.PaidInstallments < x.TotalInstallments);

        var total = await q.CountAsync(cancellationToken);

        var entities = await q
            .OrderByDescending(x => x.StartDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = entities.Select(ToDto).ToList();
        return new PagedResultDto<PayrollLoanDto>(items, pageNumber, pageSize, total);
    }

    public async Task<PayrollLoanDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var loan = await dbContext.PayrollLoans
            .AsNoTracking()
            .Include(x => x.Employee)
            .Include(x => x.Installments)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Préstamo no encontrado.");

        return ToDto(loan);
    }

    public async Task<PayrollLoanDto> CreateAsync(
        CreatePayrollLoanRequestDto request,
        string createdBy,
        CancellationToken cancellationToken = default)
    {
        if (request.TotalAmount <= 0)
            throw new InvalidOperationException("El monto total debe ser mayor a 0.");

        if (request.TotalInstallments < 1 || request.TotalInstallments > 120)
            throw new InvalidOperationException("Las cuotas deben estar entre 1 y 120.");

        if (!new[] { "loan", "advance" }.Contains(request.LoanType.ToLowerInvariant()))
            throw new InvalidOperationException("Tipo inválido. Use 'loan' o 'advance'.");

        var employee = await dbContext.Employees
            .FirstOrDefaultAsync(x => x.Id == request.EmployeeId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Empleado no encontrado.");

        var monthlyInstallment = Math.Round(request.TotalAmount / request.TotalInstallments, 2);
        // Residual is added to the last installment so the sum equals TotalAmount exactly.
        var residual = Math.Round(request.TotalAmount - (monthlyInstallment * request.TotalInstallments), 2);
        var lastInstallment = monthlyInstallment + residual;

        var loan = new PayrollLoan
        {
            EmployeeId = request.EmployeeId,
            LoanType = request.LoanType.ToLowerInvariant(),
            TotalAmount = request.TotalAmount,
            MonthlyInstallment = monthlyInstallment,
            TotalInstallments = request.TotalInstallments,
            PaidInstallments = 0,
            StartDate = request.StartDate,
            Notes = request.Notes?.Trim(),
            CreatedBy = createdBy,
            UpdatedBy = createdBy
        };

        // Generate all installments upfront
        var installments = new List<PayrollLoanInstallment>();
        var currentYear = request.StartDate.Year;
        var currentMonth = request.StartDate.Month;

        for (int i = 1; i <= request.TotalInstallments; i++)
        {
            installments.Add(new PayrollLoanInstallment
            {
                PayrollLoanId = loan.Id,
                InstallmentNumber = i,
                Year = currentYear,
                Month = currentMonth,
                Amount = i == request.TotalInstallments ? lastInstallment : monthlyInstallment,
                IsPaid = false,
                CreatedBy = createdBy,
                UpdatedBy = createdBy
            });

            currentMonth++;
            if (currentMonth > 12)
            {
                currentMonth = 1;
                currentYear++;
            }
        }

        loan.Installments = installments;

        await dbContext.PayrollLoans.AddAsync(loan, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Reload with navigation properties
        var result = await dbContext.PayrollLoans
            .Include(x => x.Employee)
            .Include(x => x.Installments)
            .FirstAsync(x => x.Id == loan.Id, cancellationToken);

        return ToDto(result);
    }

    public async Task<PayrollLoanDto> UpdateAsync(
        Guid id,
        UpdatePayrollLoanRequestDto request,
        string updatedBy,
        CancellationToken cancellationToken = default)
    {
        var loan = await dbContext.PayrollLoans
            .Include(x => x.Employee)
            .Include(x => x.Installments)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Préstamo no encontrado.");

        if (!loan.IsActive)
            throw new InvalidOperationException("No se puede editar un préstamo cancelado o completado.");

        // LoanType is just a label — safe to change at any time.
        if (request.LoanType is not null)
        {
            var normalised = request.LoanType.ToLowerInvariant();
            if (!new[] { "loan", "advance" }.Contains(normalised))
                throw new InvalidOperationException("Tipo inválido. Use 'loan' o 'advance'.");
            loan.LoanType = normalised;
        }

        loan.Notes = request.Notes?.Trim();
        loan.UpdatedAtUtc = DateTime.UtcNow;
        loan.UpdatedBy = updatedBy;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(loan);
    }

    public async Task<PayrollLoanDto> RegisterPaymentAsync(
        Guid loanId,
        Guid installmentId,
        string registeredBy,
        CancellationToken cancellationToken = default)
    {
        var loan = await dbContext.PayrollLoans
            .Include(x => x.Employee)
            .Include(x => x.Installments)
            .FirstOrDefaultAsync(x => x.Id == loanId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Préstamo no encontrado.");

        var installment = loan.Installments.FirstOrDefault(i => i.Id == installmentId && !i.IsDeleted)
            ?? throw new InvalidOperationException("Cuota no encontrada.");

        if (installment.IsPaid)
            throw new InvalidOperationException("La cuota ya se encuentra pagada.");

        var now = DateTime.UtcNow;
        installment.IsPaid = true;
        installment.PaidAtUtc = now;
        installment.UpdatedAtUtc = now;
        installment.UpdatedBy = registeredBy;

        loan.PaidInstallments += 1;
        loan.UpdatedAtUtc = now;
        loan.UpdatedBy = registeredBy;

        // Auto-close loan when all installments are paid.
        if (loan.PaidInstallments >= loan.TotalInstallments)
            loan.IsActive = false;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(loan);
    }

    public async Task<bool> CancelAsync(Guid id, string cancelledBy, CancellationToken cancellationToken = default)
    {
        var loan = await dbContext.PayrollLoans
            .Include(x => x.Installments)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (loan is null) return false;

        var now = DateTime.UtcNow;
        loan.IsActive = false;
        loan.UpdatedAtUtc = now;
        loan.UpdatedBy = cancelledBy;

        // Soft-delete unpaid installments so they don't appear in future payroll generations.
        foreach (var inst in loan.Installments.Where(i => !i.IsPaid && !i.IsDeleted))
        {
            inst.IsDeleted = true;
            inst.IsActive = false;
            inst.UpdatedAtUtc = now;
            inst.UpdatedBy = cancelledBy;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static PayrollLoanDto ToDto(PayrollLoan x)
    {
        var remaining = x.TotalInstallments - x.PaidInstallments;
        var remainingAmount = x.Installments.Where(i => !i.IsPaid).Sum(i => i.Amount);

        return new PayrollLoanDto(
            x.Id,
            x.EmployeeId,
            x.Employee.EmployeeCode,
            x.Employee.FirstName + " " + x.Employee.LastName,
            x.LoanType,
            x.TotalAmount,
            x.MonthlyInstallment,
            x.TotalInstallments,
            x.PaidInstallments,
            remaining,
            remainingAmount,
            x.StartDate,
            x.IsActive,
            x.Notes,
            x.Installments.OrderBy(i => i.InstallmentNumber)
                .Select(i => new PayrollLoanInstallmentDto(i.Id, i.InstallmentNumber, i.Year, i.Month, i.Amount, i.IsPaid, i.PaidAtUtc))
                .ToList());
    }
}
