using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class BranchConfiguration : IEntityTypeConfiguration<Branch>
{
    public void Configure(EntityTypeBuilder<Branch> builder)
    {
        builder.ToTable("Branches");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.BranchType).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.Property(x => x.Country).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Region).HasMaxLength(100).IsRequired();
        builder.Property(x => x.City).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(220).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.Email).HasMaxLength(160);
        builder.Property(x => x.ResponsibleName).HasMaxLength(140);
        builder.Property(x => x.ResponsibleTitle).HasMaxLength(120);
        builder.Property(x => x.BusinessHours).HasMaxLength(120);
        builder.Property(x => x.CostCenter).HasMaxLength(60);
        builder.HasIndex(x => x.Code).IsUnique();
    }
}
