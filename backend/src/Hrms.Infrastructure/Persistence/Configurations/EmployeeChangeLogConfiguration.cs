using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class EmployeeChangeLogConfiguration : IEntityTypeConfiguration<EmployeeChangeLog>
{
    public void Configure(EntityTypeBuilder<EmployeeChangeLog> builder)
    {
        builder.ToTable("EmployeeChangeLogs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ChangeType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.FieldName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.OldValue).HasMaxLength(500);
        builder.Property(x => x.NewValue).HasMaxLength(500);
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.ChangedByUserName).HasMaxLength(150);

        builder.HasIndex(x => x.EmployeeId);
        builder.HasIndex(x => x.ChangedAtUtc);

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
