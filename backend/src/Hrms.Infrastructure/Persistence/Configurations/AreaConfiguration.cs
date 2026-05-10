using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class AreaConfiguration : IEntityTypeConfiguration<Area>
{
    public void Configure(EntityTypeBuilder<Area> builder)
    {
        builder.ToTable("Areas");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.HasIndex(x => x.Code).IsUnique();

        builder.HasOne(x => x.ResponsibleEmployee)
            .WithMany()
            .HasForeignKey(x => x.ResponsibleEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
