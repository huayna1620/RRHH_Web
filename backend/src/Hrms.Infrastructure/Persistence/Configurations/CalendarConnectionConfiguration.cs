using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class CalendarConnectionConfiguration : IEntityTypeConfiguration<CalendarConnection>
{
    public void Configure(EntityTypeBuilder<CalendarConnection> builder)
    {
        builder.ToTable("CalendarConnections");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Provider).HasMaxLength(32).IsRequired();
        builder.Property(x => x.AccessTokenCipher).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.RefreshTokenCipher).HasColumnType("nvarchar(max)");
        builder.Property(x => x.CalendarId).HasMaxLength(256).IsRequired();
        builder.Property(x => x.ProviderAccountEmail).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.LastSyncError).HasMaxLength(500);

        // Un usuario activo solo puede tener una conexión por proveedor.
        builder.HasIndex(x => new { x.UserId, x.Provider })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class CalendarSyncEventConfiguration : IEntityTypeConfiguration<CalendarSyncEvent>
{
    public void Configure(EntityTypeBuilder<CalendarSyncEvent> builder)
    {
        builder.ToTable("CalendarSyncEvents");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.HrmsEntityType).HasMaxLength(32).IsRequired();
        builder.Property(x => x.ProviderEventId).HasMaxLength(256).IsRequired();

        // Idempotencia: una (conexión, entidad HRMS) solo puede mapearse a un evento externo.
        builder.HasIndex(x => new { x.ConnectionId, x.HrmsEntityType, x.HrmsEntityId })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder.HasOne(x => x.Connection)
            .WithMany()
            .HasForeignKey(x => x.ConnectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
