using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class VacationRequestConfiguration : IEntityTypeConfiguration<VacationRequest>
{
    public void Configure(EntityTypeBuilder<VacationRequest> builder)
    {
        builder.ToTable("VacationRequests", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_VacationRequests_Status",
                $"[Status] IN ('{VacationRequestStatuses.Pending}','{VacationRequestStatuses.Approved}','{VacationRequestStatuses.Rejected}','{VacationRequestStatuses.Cancelled}')");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.StartDate).IsRequired();
        builder.Property(x => x.EndDate).IsRequired();
        builder.Property(x => x.RequestedDays).IsRequired();
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.ReviewerComment).HasMaxLength(500);
        builder.Property(x => x.RequestedAtUtc).IsRequired();
        builder.Property(x => x.ReviewedByUserName).HasMaxLength(150);

        builder.HasIndex(x => new { x.EmployeeId, x.StartDate, x.EndDate });
        builder.HasIndex(x => new { x.Status, x.StartDate });

        builder.HasOne(x => x.Employee)
            .WithMany(x => x.VacationRequests)
            .HasForeignKey(x => x.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

    }
}
