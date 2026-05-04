using Hrms.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hrms.Infrastructure.Persistence.Configurations;

public sealed class EvaluationCycleConfiguration : IEntityTypeConfiguration<EvaluationCycle>
{
    public void Configure(EntityTypeBuilder<EvaluationCycle> builder)
    {
        builder.ToTable("EvaluationCycles");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Period).HasMaxLength(50).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(20).IsRequired();
    }
}

public sealed class EvaluationAssignmentConfiguration : IEntityTypeConfiguration<EvaluationAssignment>
{
    public void Configure(EntityTypeBuilder<EvaluationAssignment> builder)
    {
        builder.ToTable("EvaluationAssignments");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SelfComments).HasMaxLength(2000);
        builder.Property(x => x.EvaluatorComments).HasMaxLength(2000);
        builder.Property(x => x.FinalComments).HasMaxLength(2000);
        builder.Property(x => x.Status).HasMaxLength(30).IsRequired();

        builder.HasOne(x => x.Cycle).WithMany(c => c.Assignments).HasForeignKey(x => x.CycleId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Evaluator).WithMany().HasForeignKey(x => x.EvaluatorEmployeeId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.CycleId, x.EmployeeId }).IsUnique();
    }
}
