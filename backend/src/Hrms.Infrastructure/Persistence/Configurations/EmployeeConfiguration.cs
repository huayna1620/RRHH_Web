using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("Employees");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.EmployeeCode).HasMaxLength(30).IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.LastName).HasMaxLength(100).IsRequired();
        builder.Property(x => x.DocumentType).HasMaxLength(20).IsRequired();
        builder.Property(x => x.DocumentNumber).HasMaxLength(30).IsRequired();
        builder.Property(x => x.PersonalEmail).HasMaxLength(150).IsRequired();
        builder.Property(x => x.WorkEmail).HasMaxLength(150).IsRequired();
        builder.Property(x => x.PhoneNumber).HasMaxLength(50).IsRequired();
        builder.Property(x => x.BaseSalary).HasColumnType("decimal(18,2)");

        builder.Property(x => x.EmergencyContactName).HasMaxLength(150);
        builder.Property(x => x.EmergencyContactPhone).HasMaxLength(50);

        builder.Property(x => x.BankName).HasMaxLength(50);
        builder.Property(x => x.BankAccountNumber).HasMaxLength(30);
        builder.Property(x => x.BankAccountCci).HasMaxLength(20);
        builder.Property(x => x.BankAccountType).HasMaxLength(20);
        builder.Property(x => x.BankCurrency).HasMaxLength(3);

        builder.HasIndex(x => x.EmployeeCode).IsUnique();
        builder.HasIndex(x => x.DocumentNumber).IsUnique();

        builder.HasOne(x => x.Branch)
            .WithMany(x => x.Employees)
            .HasForeignKey(x => x.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Area)
            .WithMany(x => x.Employees)
            .HasForeignKey(x => x.AreaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Position)
            .WithMany(x => x.Employees)
            .HasForeignKey(x => x.PositionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ContractType)
            .WithMany(x => x.Employees)
            .HasForeignKey(x => x.ContractTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Manager)
            .WithMany(x => x.DirectReports)
            .HasForeignKey(x => x.ManagerId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
