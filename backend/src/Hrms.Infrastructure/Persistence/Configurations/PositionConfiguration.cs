using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class PositionConfiguration : IEntityTypeConfiguration<Position>
{
    public void Configure(EntityTypeBuilder<Position> builder)
    {
        builder.ToTable("Positions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);
        builder.Property(x => x.Level).HasMaxLength(80);
        builder.HasIndex(x => x.Code).IsUnique();

        builder.HasOne(x => x.Area)
            .WithMany()
            .HasForeignKey(x => x.AreaId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(x => x.ReportsToEmployee)
            .WithMany()
            .HasForeignKey(x => x.ReportsToEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
