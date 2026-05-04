using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class PayrollLoanInstallmentConfiguration : IEntityTypeConfiguration<PayrollLoanInstallment>
{
    public void Configure(EntityTypeBuilder<PayrollLoanInstallment> builder)
    {
        builder.ToTable("PayrollLoanInstallments");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Amount).HasColumnType("decimal(18,2)").IsRequired();

        builder.HasIndex(x => new { x.PayrollLoanId, x.InstallmentNumber }).IsUnique();
        builder.HasIndex(x => new { x.Year, x.Month });

        builder.HasOne(x => x.PayrollLoan)
            .WithMany(x => x.Installments)
            .HasForeignKey(x => x.PayrollLoanId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
