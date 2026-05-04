using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class PayrollRecordConfiguration : IEntityTypeConfiguration<PayrollRecord>
{
    public void Configure(EntityTypeBuilder<PayrollRecord> builder)
    {
        builder.ToTable("PayrollRecords", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint("CK_PayrollRecords_Year", "[Year] BETWEEN 2000 AND 2100");
            tableBuilder.HasCheckConstraint("CK_PayrollRecords_Month", "[Month] BETWEEN 1 AND 12");
            tableBuilder.HasCheckConstraint("CK_PayrollRecords_Status", "[Status] IN ('draft', 'approved', 'paid')");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Year).IsRequired();
        builder.Property(x => x.Month).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(20).IsRequired();
        builder.Property(x => x.ApprovedBy).HasMaxLength(100);
        builder.Property(x => x.PaidBy).HasMaxLength(100);
        builder.Property(x => x.BaseSalary).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.Bonuses).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.AutomaticBonuses).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.ManualDeductions).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.AutomaticDeductions).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.IncidentDeductions).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.LoanDeductions).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.Deductions).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.GrossIncome).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.NetPay).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(600);
        builder.Property(x => x.GeneratedAtUtc).IsRequired();

        builder.HasIndex(x => new { x.EmployeeId, x.Year, x.Month }).IsUnique();
        builder.HasIndex(x => new { x.Year, x.Month });

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.PayrollRecords)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
