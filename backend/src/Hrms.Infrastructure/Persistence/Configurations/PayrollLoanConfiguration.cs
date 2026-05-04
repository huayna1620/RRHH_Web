using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class PayrollLoanConfiguration : IEntityTypeConfiguration<PayrollLoan>
{
    public void Configure(EntityTypeBuilder<PayrollLoan> builder)
    {
        builder.ToTable("PayrollLoans", t =>
        {
            t.HasCheckConstraint("CK_PayrollLoans_LoanType", "[LoanType] IN ('loan', 'advance')");
            t.HasCheckConstraint("CK_PayrollLoans_TotalAmount", "[TotalAmount] > 0");
            t.HasCheckConstraint("CK_PayrollLoans_TotalInstallments", "[TotalInstallments] >= 1");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.LoanType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.TotalAmount).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.MonthlyInstallment).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(500);

        builder.HasIndex(x => x.EmployeeId);

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
