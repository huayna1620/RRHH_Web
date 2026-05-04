using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class AttendanceIncidentConfiguration : IEntityTypeConfiguration<AttendanceIncident>
{
    public void Configure(EntityTypeBuilder<AttendanceIncident> builder)
    {
        builder.ToTable("AttendanceIncidents");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.IncidentType).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(20).IsRequired();
        builder.Property(x => x.IncidentDate).IsRequired();
        builder.Property(x => x.MinutesImpacted).IsRequired();
        builder.Property(x => x.JustificationText).HasMaxLength(1000);
        builder.Property(x => x.ReviewedByUserName).HasMaxLength(100);
        builder.Property(x => x.ReviewerComment).HasMaxLength(500);

        var validTypes = string.Join("', '", AttendanceIncidentTypes.All);
        builder.HasCheckConstraint("CK_AttendanceIncidents_IncidentType", $"[IncidentType] IN ('{validTypes}')");

        var validStatuses = string.Join("', '", AttendanceIncidentStatuses.All);
        builder.HasCheckConstraint("CK_AttendanceIncidents_Status", $"[Status] IN ('{validStatuses}')");

        builder.HasIndex(x => new { x.EmployeeId, x.IncidentDate });
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.AttendanceRecordId);

        builder.HasOne(x => x.Employee)
            .WithMany()
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AttendanceRecord)
            .WithMany()
            .HasForeignKey(x => x.AttendanceRecordId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
