using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class RecruitmentCandidateConfiguration : IEntityTypeConfiguration<RecruitmentCandidate>
{
    public void Configure(EntityTypeBuilder<RecruitmentCandidate> builder)
    {
        builder.ToTable("RecruitmentCandidates", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_RecruitmentCandidates_CurrentStatus",
                $"[CurrentStatus] IN ('{RecruitmentCandidateStatuses.New}','{RecruitmentCandidateStatuses.Screening}','{RecruitmentCandidateStatuses.Interview}','{RecruitmentCandidateStatuses.Offered}','{RecruitmentCandidateStatuses.Hired}','{RecruitmentCandidateStatuses.Rejected}')");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.FullName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(160).IsRequired();
        builder.Property(x => x.PhoneNumber).HasMaxLength(40).IsRequired();
        builder.Property(x => x.PositionApplied).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ExpectedSalary).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Source).HasMaxLength(80);
        builder.Property(x => x.CurrentStatus).HasMaxLength(30).IsRequired();
        builder.Property(x => x.ApplicationDate).IsRequired();
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.RejectionReason).HasMaxLength(500);
        builder.Property(x => x.CreatedBy).HasMaxLength(120);
        builder.Property(x => x.UpdatedBy).HasMaxLength(120);

        builder.HasOne(x => x.JobPosting)
            .WithMany(x => x.Candidates)
            .HasForeignKey(x => x.JobPostingId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.HasIndex(x => x.Email);
        builder.HasIndex(x => x.JobPostingId);
        builder.HasIndex(x => x.CurrentStatus);
        builder.HasIndex(x => x.IsPotentialHire);
        builder.HasIndex(x => new { x.PositionApplied, x.ApplicationDate });
    }
}
