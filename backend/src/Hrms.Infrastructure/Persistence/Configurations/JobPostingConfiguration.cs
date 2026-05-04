using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class JobPostingConfiguration : IEntityTypeConfiguration<JobPosting>
{
    public void Configure(EntityTypeBuilder<JobPosting> builder)
    {
        builder.ToTable("JobPostings");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).HasMaxLength(2000);
        builder.Property(x => x.AreaName).HasMaxLength(120);
        builder.Property(x => x.PositionName).HasMaxLength(120);
        builder.Property(x => x.Status).IsRequired().HasMaxLength(20).HasDefaultValue("open");
        builder.Property(x => x.Notes).HasMaxLength(1000);
        builder.Property(x => x.CreatedBy).HasMaxLength(120);
        builder.Property(x => x.UpdatedBy).HasMaxLength(120);

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.OpenedDate);
    }
}
