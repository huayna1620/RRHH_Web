using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class ContractTypeConfiguration : IEntityTypeConfiguration<ContractType>
{
    public void Configure(EntityTypeBuilder<ContractType> builder)
    {
        builder.ToTable("ContractTypes");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Code).HasMaxLength(30).IsRequired();
        builder.HasIndex(x => x.Code).IsUnique();
    }
}
