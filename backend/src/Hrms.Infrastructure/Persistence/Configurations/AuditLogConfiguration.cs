using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.UserName).HasMaxLength(150);
        builder.Property(x => x.Action).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Module).HasMaxLength(80).IsRequired();
        builder.Property(x => x.EntityId).HasMaxLength(80).IsRequired();
        builder.Property(x => x.EntityType).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Details).HasMaxLength(4000);
        builder.Property(x => x.IpAddress).HasMaxLength(60);

        builder.HasIndex(x => x.Timestamp);
        builder.HasIndex(x => x.Module);
        builder.HasIndex(x => x.UserId);
    }
}
