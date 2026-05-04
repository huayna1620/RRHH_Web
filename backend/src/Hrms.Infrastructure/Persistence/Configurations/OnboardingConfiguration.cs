using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class OnboardingTemplateConfiguration : IEntityTypeConfiguration<OnboardingTemplate>
{
    public void Configure(EntityTypeBuilder<OnboardingTemplate> builder)
    {
        builder.ToTable("OnboardingTemplates");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
    }
}

public sealed class OnboardingTemplateTaskConfiguration : IEntityTypeConfiguration<OnboardingTemplateTask>
{
    public void Configure(EntityTypeBuilder<OnboardingTemplateTask> builder)
    {
        builder.ToTable("OnboardingTemplateTasks");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.HasOne(x => x.Template).WithMany(t => t.Tasks).HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class OnboardingProcessConfiguration : IEntityTypeConfiguration<OnboardingProcess>
{
    public void Configure(EntityTypeBuilder<OnboardingProcess> builder)
    {
        builder.ToTable("OnboardingProcesses");
        builder.HasKey(x => x.Id);
        builder.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Template).WithMany().HasForeignKey(x => x.TemplateId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class OnboardingTaskConfiguration : IEntityTypeConfiguration<OnboardingTask>
{
    public void Configure(EntityTypeBuilder<OnboardingTask> builder)
    {
        builder.ToTable("OnboardingTasks");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.CompletedByUserName).HasMaxLength(100);
        builder.HasOne(x => x.Process).WithMany(p => p.Tasks).HasForeignKey(x => x.ProcessId).OnDelete(DeleteBehavior.Cascade);
    }
}
