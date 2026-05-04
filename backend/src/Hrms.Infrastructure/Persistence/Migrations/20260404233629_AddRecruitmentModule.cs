using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRecruitmentModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecruitmentCandidates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    PositionApplied = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    ExpectedSalary = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Source = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    CurrentStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsPotentialHire = table.Column<bool>(type: "bit", nullable: false),
                    ApplicationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    NextStepDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    LastStatusChangeAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecruitmentCandidates", x => x.Id);
                    table.CheckConstraint("CK_RecruitmentCandidates_CurrentStatus", "[CurrentStatus] IN ('new','screening','interview','offered','hired','rejected')");
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecruitmentCandidates_CurrentStatus",
                table: "RecruitmentCandidates",
                column: "CurrentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_RecruitmentCandidates_Email",
                table: "RecruitmentCandidates",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_RecruitmentCandidates_IsPotentialHire",
                table: "RecruitmentCandidates",
                column: "IsPotentialHire");

            migrationBuilder.CreateIndex(
                name: "IX_RecruitmentCandidates_PositionApplied_ApplicationDate",
                table: "RecruitmentCandidates",
                columns: new[] { "PositionApplied", "ApplicationDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecruitmentCandidates");
        }
    }
}
