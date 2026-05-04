using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase4_Recruitment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UpdatedBy",
                table: "RecruitmentCandidates",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                table: "RecruitmentCandidates",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ConvertedEmployeeId",
                table: "RecruitmentCandidates",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ConvertedToEmployee",
                table: "RecruitmentCandidates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "JobPostingId",
                table: "RecruitmentCandidates",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "RecruitmentCandidates",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CandidateStatusHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CandidateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ToStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ChangedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ChangedBy = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidateStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CandidateStatusHistory_RecruitmentCandidates_CandidateId",
                        column: x => x.CandidateId,
                        principalTable: "RecruitmentCandidates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "JobPostings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AreaName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    PositionName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "open"),
                    OpenedDate = table.Column<DateOnly>(type: "date", nullable: false),
                    ClosedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    RequiredCount = table.Column<int>(type: "int", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobPostings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecruitmentCandidates_JobPostingId",
                table: "RecruitmentCandidates",
                column: "JobPostingId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateStatusHistory_CandidateId",
                table: "CandidateStatusHistory",
                column: "CandidateId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidateStatusHistory_ChangedAtUtc",
                table: "CandidateStatusHistory",
                column: "ChangedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_OpenedDate",
                table: "JobPostings",
                column: "OpenedDate");

            migrationBuilder.CreateIndex(
                name: "IX_JobPostings_Status",
                table: "JobPostings",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_RecruitmentCandidates_JobPostings_JobPostingId",
                table: "RecruitmentCandidates",
                column: "JobPostingId",
                principalTable: "JobPostings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RecruitmentCandidates_JobPostings_JobPostingId",
                table: "RecruitmentCandidates");

            migrationBuilder.DropTable(
                name: "CandidateStatusHistory");

            migrationBuilder.DropTable(
                name: "JobPostings");

            migrationBuilder.DropIndex(
                name: "IX_RecruitmentCandidates_JobPostingId",
                table: "RecruitmentCandidates");

            migrationBuilder.DropColumn(
                name: "ConvertedEmployeeId",
                table: "RecruitmentCandidates");

            migrationBuilder.DropColumn(
                name: "ConvertedToEmployee",
                table: "RecruitmentCandidates");

            migrationBuilder.DropColumn(
                name: "JobPostingId",
                table: "RecruitmentCandidates");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "RecruitmentCandidates");

            migrationBuilder.AlterColumn<string>(
                name: "UpdatedBy",
                table: "RecruitmentCandidates",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "CreatedBy",
                table: "RecruitmentCandidates",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(120)",
                oldMaxLength: 120,
                oldNullable: true);
        }
    }
}
