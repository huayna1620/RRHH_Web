using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class GeneralSettingConfiguration : IEntityTypeConfiguration<GeneralSetting>
{
    public void Configure(EntityTypeBuilder<GeneralSetting> builder)
    {
        builder.ToTable("GeneralSettings");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Key).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Value).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.Property(x => x.IsSensitive).IsRequired();

        builder.HasIndex(x => x.Key).IsUnique();
    }
}
