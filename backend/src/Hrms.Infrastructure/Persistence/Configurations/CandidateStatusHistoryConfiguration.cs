using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class CandidateStatusHistoryConfiguration : IEntityTypeConfiguration<CandidateStatusHistory>
{
    public void Configure(EntityTypeBuilder<CandidateStatusHistory> builder)
    {
        builder.ToTable("CandidateStatusHistory");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FromStatus).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ToStatus).IsRequired().HasMaxLength(30);
        builder.Property(x => x.ChangedBy).IsRequired().HasMaxLength(120);
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.RejectionReason).HasMaxLength(500);

        builder.HasOne(x => x.Candidate)
            .WithMany()
            .HasForeignKey(x => x.CandidateId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.CandidateId);
        builder.HasIndex(x => x.ChangedAtUtc);
    }
}
