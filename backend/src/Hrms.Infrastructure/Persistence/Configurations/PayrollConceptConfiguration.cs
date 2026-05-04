using Hrms.Domain.Constants;
using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class PayrollConceptConfiguration : IEntityTypeConfiguration<PayrollConcept>
{
    public void Configure(EntityTypeBuilder<PayrollConcept> builder)
    {
        builder.ToTable("PayrollConcepts", t =>
        {
            var validTypes = string.Join("', '", PayrollConceptTypes.All);
            t.HasCheckConstraint("CK_PayrollConcepts_Type", $"[Type] IN ('{validTypes}')");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Type).HasMaxLength(20).IsRequired();
        builder.Property(x => x.FixedAmount).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Percentage).HasColumnType("decimal(5,2)");
        builder.Property(x => x.Description).HasMaxLength(300);

        builder.HasIndex(x => x.Code).IsUnique();
    }
}
