using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class DocumentTemplateConfiguration : IEntityTypeConfiguration<DocumentTemplate>
{
    public void Configure(EntityTypeBuilder<DocumentTemplate> builder)
    {
        builder.ToTable("DocumentTemplates");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Type).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Category).HasMaxLength(100).HasDefaultValue("");
        builder.Property(x => x.VariablesJson).HasColumnType("nvarchar(max)").HasDefaultValue("[]");
        builder.Property(x => x.Format).HasMaxLength(30).HasDefaultValue("html");
        builder.Property(x => x.Description).HasMaxLength(500);
        builder.HasIndex(x => new { x.Type, x.Category });
    }
}

public sealed class EmployeeDocumentConfiguration : IEntityTypeConfiguration<EmployeeDocument>
{
    public void Configure(EntityTypeBuilder<EmployeeDocument> builder)
    {
        builder.ToTable("EmployeeDocuments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Type).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(30).IsRequired();
        builder.Property(x => x.SignedByUserName).HasMaxLength(100);
        builder.Property(x => x.SignatureHash).HasMaxLength(256);
        builder.Property(x => x.RejectionReason).HasMaxLength(500);
        builder.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Template).WithMany().HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(x => new { x.EmployeeId, x.Status });
        builder.HasIndex(x => x.ExpiresAtUtc);
    }
}
