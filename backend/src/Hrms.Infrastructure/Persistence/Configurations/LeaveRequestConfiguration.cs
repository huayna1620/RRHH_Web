using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class LeaveRequestConfiguration : IEntityTypeConfiguration<LeaveRequest>
{
    public void Configure(EntityTypeBuilder<LeaveRequest> builder)
    {
        builder.ToTable("LeaveRequests", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_LeaveRequests_Status",
                $"[Status] IN ('{LeaveRequestStatuses.Pending}','{LeaveRequestStatuses.Approved}','{LeaveRequestStatuses.Rejected}','{LeaveRequestStatuses.Cancelled}')");

            tableBuilder.HasCheckConstraint(
                "CK_LeaveRequests_LeaveType",
                $"[LeaveType] IN ('{LeaveRequestTypes.Personal}','{LeaveRequestTypes.Medical}','{LeaveRequestTypes.Study}','{LeaveRequestTypes.MaternityPaternity}','{LeaveRequestTypes.Other}')");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.LeaveType).IsRequired().HasMaxLength(40);
        builder.Property(x => x.StartDate).IsRequired();
        builder.Property(x => x.EndDate).IsRequired();
        builder.Property(x => x.RequestedDays).IsRequired();
        builder.Property(x => x.IsPaid).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Reason).HasMaxLength(600);
        builder.Property(x => x.ReviewerComment).HasMaxLength(600);
        builder.Property(x => x.RequestedAtUtc).IsRequired();
        builder.Property(x => x.ReviewedByUserName).HasMaxLength(150);

        builder.HasIndex(x => new { x.EmployeeId, x.StartDate, x.EndDate });
        builder.HasIndex(x => new { x.Status, x.StartDate });
        builder.HasIndex(x => x.LeaveType);

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.LeaveRequests)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
