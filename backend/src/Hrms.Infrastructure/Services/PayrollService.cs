using System.IO.Compression;
using Hrms.Application.DTOs.Common;
using Hrms.Application.DTOs.Payroll;
using Hrms.Application.Interfaces.Services;
using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Hrms.Infrastructure.Persistence.Context;
using Hrms.Infrastructure.Reports;
using Microsoft.EntityFrameworkCore;

namespace Hrms.Infrastructure.Services;

public sealed class PayrollService(HrmsDbContext dbContext, IIntegrationService integrationService) : IPayrollService
{
    public async Task<PagedResultDto<PayrollListItemDto>> GetPagedAsync(PayrollQueryDto query, CancellationToken cancellationToken = default)
    {
        var pageNumber = query.PageNumber <= 0 ? 1 : query.PageNumber;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var q = dbContext.PayrollRecords
            .AsNoTracking()
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .Where(x => !x.IsDeleted);

        if (query.Year.HasValue || query.Month.HasValue)
        {
            var year = query.Year ?? DateTime.UtcNow.Year;
            var month = query.Month ?? DateTime.UtcNow.Month;
            ValidatePeriod(year, month);
            q = q.Where(x => x.Year == year && x.Month == month);
        }

        if (query.StartDate.HasValue || query.EndDate.HasValue)
        {
            var startDate = query.StartDate;
            var endDate = query.EndDate;

            if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
            {
                throw new InvalidOperationException("El rango de fechas no es valido.");
            }

            if (startDate.HasValue)
            {
                var startPeriod = startDate.Value.Year * 100 + startDate.Value.Month;
                q = q.Where(x => (x.Year * 100 + x.Month) >= startPeriod);
            }

            if (endDate.HasValue)
            {
                var endPeriod = endDate.Value.Year * 100 + endDate.Value.Month;
                q = q.Where(x => (x.Year * 100 + x.Month) <= endPeriod);
            }
        }
        else if (!query.Year.HasValue && !query.Month.HasValue)
        {
            var year = DateTime.UtcNow.Year;
            var month = DateTime.UtcNow.Month;
            q = q.Where(x => x.Year == year && x.Month == month);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLowerInvariant();
            q = q.Where(x => x.Employee.EmployeeCode.ToLower().Contains(s) ||
                              x.Employee.FirstName.ToLower().Contains(s) ||
                              x.Employee.LastName.ToLower().Contains(s));
        }
        if (query.EmployeeId.HasValue)
            q = q.Where(x => x.EmployeeId == query.EmployeeId.Value);
        if (query.AreaId.HasValue)
            q = q.Where(x => x.Employee.AreaId == query.AreaId.Value);

        var totalCount = await q.CountAsync(cancellationToken);
        var entities = await q.OrderBy(x => x.Employee.LastName).ThenBy(x => x.Employee.FirstName)
            .Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResultDto<PayrollListItemDto>(entities.Select(ToDto).ToList(), pageNumber, pageSize, totalCount);
    }

    public async Task<PayrollListItemDto> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var record = await dbContext.PayrollRecords.AsNoTracking()
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Registro de planilla no encontrado.");
        return ToDto(record);
    }

    public async Task<PayrollCatalogsDto> GetCatalogsAsync(CancellationToken cancellationToken = default)
    {
        var employees = await dbContext.Employees.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive)
            .OrderBy(x => x.LastName).ThenBy(x => x.FirstName)
            .Select(x => new PayrollEmployeeOptionDto(x.Id, x.EmployeeCode + " - " + x.FirstName + " " + x.LastName))
            .ToListAsync(cancellationToken);
        var areas = await dbContext.Areas.AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Name)
            .Select(x => new PayrollAreaOptionDto(x.Id, x.Name))
            .ToListAsync(cancellationToken);

        return new PayrollCatalogsDto(employees, areas);
    }

    public async Task<GeneratePayrollResultDto> GenerateAsync(
        GeneratePayrollRequestDto request, string generatedBy, CancellationToken cancellationToken = default)
    {
        ValidatePeriod(request.Year, request.Month);
        var (dailyDivisor, workHoursPerDay) = await GetPayrollSettingsAsync(cancellationToken);

        var automaticConcepts = await dbContext.PayrollConcepts.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive && x.IsAutomatic)
            .ToListAsync(cancellationToken);

        var periodEnd = new DateOnly(request.Year, request.Month, 1).AddMonths(1).AddDays(-1);
        var employeesQuery = dbContext.Employees.Where(x => !x.IsDeleted && x.IsActive && x.HireDate <= periodEnd);
        if (request.EmployeeId.HasValue)
            employeesQuery = employeesQuery.Where(x => x.Id == request.EmployeeId.Value);

        var employees = await employeesQuery.Select(x => new { x.Id, x.BaseSalary }).ToListAsync(cancellationToken);
        if (employees.Count == 0) throw new InvalidOperationException("No hay empleados activos para generar planilla.");

        var employeeIds = employees.Select(x => x.Id).ToArray();
        var fromDate = new DateOnly(request.Year, request.Month, 1);
        var toDate = fromDate.AddMonths(1).AddDays(-1);

        var incidentData = await dbContext.AttendanceIncidents.AsNoTracking()
            .Where(x => !x.IsDeleted && x.IncidentDate >= fromDate && x.IncidentDate <= toDate
                && employeeIds.Contains(x.EmployeeId) && x.Status != AttendanceIncidentStatuses.Justified)
            .GroupBy(x => x.EmployeeId)
            .Select(g => new
            {
                EmployeeId = g.Key,
                TardanzaMinutes = g.Where(i => i.IncidentType == AttendanceIncidentTypes.Tardanza).Sum(i => i.MinutesImpacted),
                Faltas = g.Count(i => i.IncidentType == AttendanceIncidentTypes.Falta || i.IncidentType == AttendanceIncidentTypes.NoMarcacion)
            })
            .ToDictionaryAsync(x => x.EmployeeId, cancellationToken);

        var loanData = await dbContext.PayrollLoanInstallments.AsNoTracking()
            .Where(x => !x.IsDeleted && x.Year == request.Year && x.Month == request.Month
                && !x.IsPaid && x.PayrollLoan.IsActive && employeeIds.Contains(x.PayrollLoan.EmployeeId))
            .GroupBy(x => x.PayrollLoan.EmployeeId)
            .Select(g => new { EmployeeId = g.Key, LoanTotal = g.Sum(i => i.Amount) })
            .ToDictionaryAsync(x => x.EmployeeId, cancellationToken);

        var existingRecords = await dbContext.PayrollRecords
            .Where(x => !x.IsDeleted && x.Year == request.Year && x.Month == request.Month && employeeIds.Contains(x.EmployeeId))
            .ToDictionaryAsync(x => x.EmployeeId, cancellationToken);

        var generatedCount = 0;
        var updatedCount = 0;
        var now = DateTime.UtcNow;

        foreach (var emp in employees)
        {
            if (existingRecords.TryGetValue(emp.Id, out var existing))
            {
                if (existing.Status == PayrollRecordStatuses.Paid) continue;
                if (!request.ForceRecalculate) continue;
            }

            if (emp.BaseSalary <= 0) continue;

            var dailyRate = emp.BaseSalary / dailyDivisor;
            var minuteRate = dailyRate / (workHoursPerDay * 60);

            decimal incidentDeductions = 0;
            if (incidentData.TryGetValue(emp.Id, out var inc))
            {
                incidentDeductions = Math.Round(inc.TardanzaMinutes * minuteRate + inc.Faltas * dailyRate, 2);
            }

            decimal autoBonuses = 0;
            decimal autoDeductions = 0;
            foreach (var concept in automaticConcepts)
            {
                var amount = concept.FixedAmount ?? Math.Round((concept.Percentage!.Value / 100m) * emp.BaseSalary, 2);
                if (concept.Type == PayrollConceptTypes.Earning) autoBonuses += amount;
                else autoDeductions += amount;
            }

            var loanDeductions = loanData.TryGetValue(emp.Id, out var ld) ? ld.LoanTotal : 0m;

            if (existing is null)
            {
                var record = new PayrollRecord
                {
                    EmployeeId = emp.Id,
                    Year = request.Year,
                    Month = request.Month,
                    Status = PayrollRecordStatuses.Draft,
                    BaseSalary = emp.BaseSalary,
                    Bonuses = 0,
                    AutomaticBonuses = autoBonuses,
                    ManualDeductions = 0,
                    AutomaticDeductions = autoDeductions,
                    IncidentDeductions = incidentDeductions,
                    LoanDeductions = loanDeductions,
                    GeneratedAtUtc = now,
                    LastCalculatedAtUtc = now,
                    CreatedBy = generatedBy,
                    UpdatedBy = generatedBy
                };
                Recalculate(record);
                await dbContext.PayrollRecords.AddAsync(record, cancellationToken);
                generatedCount++;
            }
            else
            {
                // Recalculate ONLY the automatic fields. Manual Bonuses + ManualDeductions + Notes are preserved.
                existing.BaseSalary = emp.BaseSalary;
                existing.AutomaticBonuses = autoBonuses;
                existing.AutomaticDeductions = autoDeductions;
                existing.IncidentDeductions = incidentDeductions;
                existing.LoanDeductions = loanDeductions;
                existing.LastCalculatedAtUtc = now;
                existing.UpdatedAtUtc = now;
                existing.UpdatedBy = generatedBy;
                Recalculate(existing);
                updatedCount++;
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return new GeneratePayrollResultDto(generatedCount, updatedCount, generatedCount + updatedCount);
    }

    public async Task<PayrollListItemDto> UpdateAdjustmentsAsync(
        Guid payrollRecordId, UpdatePayrollAdjustmentsRequestDto request, string updatedBy, CancellationToken cancellationToken = default)
    {
        if (request.Bonuses < 0) throw new InvalidOperationException("Los bonos no pueden ser negativos.");
        if (request.Deductions < 0) throw new InvalidOperationException("Los descuentos no pueden ser negativos.");

        var record = await dbContext.PayrollRecords
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .FirstOrDefaultAsync(x => x.Id == payrollRecordId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("No existe el registro de planilla.");

        if (record.Status == PayrollRecordStatuses.Paid)
            throw new InvalidOperationException("No se puede modificar una planilla ya pagada.");

        var now = DateTime.UtcNow;
        record.Bonuses = request.Bonuses;
        record.ManualDeductions = request.Deductions;
        record.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        record.LastCalculatedAtUtc = now;
        record.UpdatedAtUtc = now;
        record.UpdatedBy = updatedBy;
        Recalculate(record);

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToDto(record);
    }

    public async Task<int> ApproveAsync(int year, int month, string approvedBy, CancellationToken cancellationToken = default)
    {
        ValidatePeriod(year, month);
        var records = await dbContext.PayrollRecords
            .Where(x => !x.IsDeleted && x.Year == year && x.Month == month && x.Status == PayrollRecordStatuses.Draft)
            .ToListAsync(cancellationToken);

        if (records.Count == 0) throw new InvalidOperationException("No hay planillas en borrador para aprobar en este periodo.");

        var now = DateTime.UtcNow;
        foreach (var r in records)
        {
            r.Status = PayrollRecordStatuses.Approved;
            r.ApprovedAtUtc = now;
            r.ApprovedBy = approvedBy;
            r.UpdatedAtUtc = now;
            r.UpdatedBy = approvedBy;
        }
        await dbContext.SaveChangesAsync(cancellationToken);

        await integrationService.DispatchEventAsync("payroll.approved", new
        {
            year,
            month,
            totalEmployees = records.Count,
            totalNetPay = records.Sum(r => r.NetPay),
            approvedBy,
            approvedAtUtc = now
        }, cancellationToken);

        return records.Count;
    }

    public async Task<int> UnapproveAsync(int year, int month, string updatedBy, CancellationToken cancellationToken = default)
    {
        ValidatePeriod(year, month);
        var records = await dbContext.PayrollRecords
            .Where(x => !x.IsDeleted && x.Year == year && x.Month == month && x.Status == PayrollRecordStatuses.Approved)
            .ToListAsync(cancellationToken);

        if (records.Count == 0) throw new InvalidOperationException("No hay planillas aprobadas para revertir en este periodo.");

        var now = DateTime.UtcNow;
        foreach (var r in records)
        {
            r.Status = PayrollRecordStatuses.Draft;
            r.ApprovedAtUtc = null;
            r.ApprovedBy = null;
            r.UpdatedAtUtc = now;
            r.UpdatedBy = updatedBy;
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return records.Count;
    }

    public async Task<int> MarkPaidAsync(int year, int month, string paidBy, CancellationToken cancellationToken = default)
    {
        ValidatePeriod(year, month);
        var records = await dbContext.PayrollRecords
            .Where(x => !x.IsDeleted && x.Year == year && x.Month == month && x.Status == PayrollRecordStatuses.Approved)
            .ToListAsync(cancellationToken);

        if (records.Count == 0) throw new InvalidOperationException("No hay planillas aprobadas para pagar en este periodo.");

        var now = DateTime.UtcNow;
        var employeeIds = records.Select(r => r.EmployeeId).ToList();

        var installments = await dbContext.PayrollLoanInstallments
            .Include(x => x.PayrollLoan)
            .Where(x => !x.IsDeleted && x.Year == year && x.Month == month && !x.IsPaid
                && x.PayrollLoan.IsActive && employeeIds.Contains(x.PayrollLoan.EmployeeId))
            .ToListAsync(cancellationToken);

        foreach (var inst in installments)
        {
            inst.IsPaid = true;
            inst.PaidAtUtc = now;
            inst.UpdatedAtUtc = now;
            inst.UpdatedBy = paidBy;
            inst.PayrollLoan.PaidInstallments++;
            inst.PayrollLoan.UpdatedAtUtc = now;
            inst.PayrollLoan.UpdatedBy = paidBy;
            if (inst.PayrollLoan.PaidInstallments >= inst.PayrollLoan.TotalInstallments)
                inst.PayrollLoan.IsActive = false;
        }

        foreach (var r in records)
        {
            r.Status = PayrollRecordStatuses.Paid;
            r.PaidAtUtc = now;
            r.PaidBy = paidBy;
            r.UpdatedAtUtc = now;
            r.UpdatedBy = paidBy;
        }
        await dbContext.SaveChangesAsync(cancellationToken);
        return records.Count;
    }

    public async Task<byte[]> GeneratePayslipPdfAsync(Guid payrollRecordId, CancellationToken cancellationToken = default)
    {
        var record = await dbContext.PayrollRecords.AsNoTracking()
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .Include(x => x.Employee).ThenInclude(x => x.Position)
            .FirstOrDefaultAsync(x => x.Id == payrollRecordId && !x.IsDeleted, cancellationToken)
            ?? throw new InvalidOperationException("Registro de planilla no encontrado.");

        var companyName = await GetSettingValueAsync("company.name", "Empresa", cancellationToken);
        var companyRuc = await GetSettingValueAsync("company.ruc", "", cancellationToken);

        var fromDate = new DateOnly(record.Year, record.Month, 1);
        var toDate = fromDate.AddMonths(1).AddDays(-1);

        var incidentStats = await dbContext.AttendanceIncidents.AsNoTracking()
            .Where(x => !x.IsDeleted && x.EmployeeId == record.EmployeeId
                && x.IncidentDate >= fromDate && x.IncidentDate <= toDate
                && x.Status != AttendanceIncidentStatuses.Justified)
            .GroupBy(x => 1)
            .Select(g => new
            {
                TardanzaMinutes = g.Where(i => i.IncidentType == AttendanceIncidentTypes.Tardanza).Sum(i => i.MinutesImpacted),
                Faltas = g.Count(i => i.IncidentType == AttendanceIncidentTypes.Falta || i.IncidentType == AttendanceIncidentTypes.NoMarcacion)
            })
            .FirstOrDefaultAsync(cancellationToken);

        var data = new PayslipData(
            record.Employee.EmployeeCode,
            record.Employee.FirstName + " " + record.Employee.LastName,
            record.Employee.Area.Name,
            record.Employee.Position.Name,
            companyName, companyRuc,
            record.Year, record.Month, record.Status,
            record.BaseSalary, record.Bonuses, record.AutomaticBonuses,
            record.ManualDeductions, record.AutomaticDeductions,
            record.IncidentDeductions, record.LoanDeductions,
            record.GrossIncome, record.NetPay,
            incidentStats?.Faltas ?? 0, incidentStats?.TardanzaMinutes ?? 0,
            record.Notes, record.GeneratedAtUtc);

        return PayslipPdfGenerator.Generate(data);
    }

    public async Task<byte[]> GenerateBulkPayslipZipAsync(int year, int month, CancellationToken cancellationToken = default)
    {
        ValidatePeriod(year, month);

        var records = await dbContext.PayrollRecords.AsNoTracking()
            .Include(x => x.Employee).ThenInclude(x => x.Area)
            .Include(x => x.Employee).ThenInclude(x => x.Position)
            .Where(x => !x.IsDeleted && x.Year == year && x.Month == month)
            .OrderBy(x => x.Employee.LastName).ThenBy(x => x.Employee.FirstName)
            .ToListAsync(cancellationToken);

        if (records.Count == 0)
            throw new InvalidOperationException("No hay registros de planilla para el periodo seleccionado.");

        var companyName = await GetSettingValueAsync("company.name", "Empresa", cancellationToken);
        var companyRuc = await GetSettingValueAsync("company.ruc", "", cancellationToken);
        var fromDate = new DateOnly(year, month, 1);
        var toDate = fromDate.AddMonths(1).AddDays(-1);

        var employeeIds = records.Select(r => r.EmployeeId).ToList();
        var incidentsByEmployee = await dbContext.AttendanceIncidents.AsNoTracking()
            .Where(x => !x.IsDeleted && employeeIds.Contains(x.EmployeeId)
                && x.IncidentDate >= fromDate && x.IncidentDate <= toDate
                && x.Status != AttendanceIncidentStatuses.Justified)
            .GroupBy(x => x.EmployeeId)
            .Select(g => new
            {
                EmployeeId = g.Key,
                TardanzaMinutes = g.Where(i => i.IncidentType == AttendanceIncidentTypes.Tardanza).Sum(i => i.MinutesImpacted),
                Faltas = g.Count(i => i.IncidentType == AttendanceIncidentTypes.Falta || i.IncidentType == AttendanceIncidentTypes.NoMarcacion)
            })
            .ToDictionaryAsync(x => x.EmployeeId, cancellationToken);

        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var record in records)
            {
                incidentsByEmployee.TryGetValue(record.EmployeeId, out var stats);

                var data = new PayslipData(
                    record.Employee.EmployeeCode,
                    record.Employee.FirstName + " " + record.Employee.LastName,
                    record.Employee.Area.Name,
                    record.Employee.Position.Name,
                    companyName, companyRuc,
                    record.Year, record.Month, record.Status,
                    record.BaseSalary, record.Bonuses, record.AutomaticBonuses,
                    record.ManualDeductions, record.AutomaticDeductions,
                    record.IncidentDeductions, record.LoanDeductions,
                    record.GrossIncome, record.NetPay,
                    stats?.Faltas ?? 0, stats?.TardanzaMinutes ?? 0,
                    record.Notes, record.GeneratedAtUtc);

                var pdfBytes = PayslipPdfGenerator.Generate(data);
                var fileName = $"boleta_{record.Employee.EmployeeCode}_{year}_{month:D2}.pdf";
                var entry = zip.CreateEntry(fileName, CompressionLevel.Fastest);
                using var entryStream = entry.Open();
                await entryStream.WriteAsync(pdfBytes, cancellationToken);
            }
        }

        return ms.ToArray();
    }

    private static void Recalculate(PayrollRecord r)
    {
        r.Deductions = r.ManualDeductions + r.AutomaticDeductions + r.IncidentDeductions + r.LoanDeductions;
        r.GrossIncome = r.BaseSalary + r.Bonuses + r.AutomaticBonuses;
        r.NetPay = Math.Max(0, r.GrossIncome - r.Deductions);
    }

    private async Task<(decimal dailyDivisor, decimal workHoursPerDay)> GetPayrollSettingsAsync(CancellationToken cancellationToken)
    {
        var keys = new[] { "payroll.daily_divisor", "payroll.work_hours_per_day" };
        var settings = await dbContext.GeneralSettings.AsNoTracking()
            .Where(x => keys.Contains(x.Key) && !x.IsDeleted)
            .ToDictionaryAsync(x => x.Key, x => x.Value, cancellationToken);

        var dailyDivisor = decimal.TryParse(settings.GetValueOrDefault("payroll.daily_divisor", "30"), out var d) ? d : 30m;
        var workHours = decimal.TryParse(settings.GetValueOrDefault("payroll.work_hours_per_day", "8"), out var h) ? h : 8m;
        return (dailyDivisor, workHours);
    }

    private async Task<string> GetSettingValueAsync(string key, string defaultValue, CancellationToken cancellationToken)
    {
        var s = await dbContext.GeneralSettings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Key == key && !x.IsDeleted, cancellationToken);
        return s?.Value ?? defaultValue;
    }

    private static PayrollListItemDto ToDto(PayrollRecord r) =>
        new(r.Id, r.EmployeeId, r.Employee.EmployeeCode,
            r.Employee.FirstName + " " + r.Employee.LastName, r.Employee.Area.Name,
            r.Year, r.Month, r.Status,
            r.BaseSalary, r.Bonuses, r.AutomaticBonuses,
            r.ManualDeductions, r.AutomaticDeductions, r.IncidentDeductions, r.LoanDeductions,
            r.Deductions, r.GrossIncome, r.NetPay, r.Notes,
            r.GeneratedAtUtc, r.LastCalculatedAtUtc, r.ApprovedAtUtc, r.ApprovedBy, r.PaidAtUtc, r.PaidBy);

    private static void ValidatePeriod(int year, int month)
    {
        if (year is < 2000 or > 2100) throw new InvalidOperationException("El año de planilla no es valido.");
        if (month is < 1 or > 12) throw new InvalidOperationException("El mes de planilla no es valido.");
    }
}
