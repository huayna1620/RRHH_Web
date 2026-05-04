using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class AttendanceRecordConfiguration : IEntityTypeConfiguration<AttendanceRecord>
{
    public void Configure(EntityTypeBuilder<AttendanceRecord> builder)
    {
        builder.ToTable("AttendanceRecords");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.AttendanceDate).IsRequired();
        builder.Property(x => x.LateMinutes).IsRequired();
        builder.Property(x => x.Justification).HasMaxLength(500);

        builder.HasIndex(x => new { x.EmployeeId, x.AttendanceDate }).IsUnique();
        builder.HasIndex(x => x.AttendanceDate);

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.AttendanceRecords)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
