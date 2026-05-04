using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase2C_AttendanceIncidents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AttendanceIncidents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AttendanceRecordId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IncidentType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IncidentDate = table.Column<DateOnly>(type: "date", nullable: false),
                    MinutesImpacted = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    JustificationText = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    JustificationSubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    JustificationDeadlineUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedByUserName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewerComment = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceIncidents", x => x.Id);
                    table.CheckConstraint("CK_AttendanceIncidents_IncidentType", "[IncidentType] IN ('tardanza', 'falta', 'salida_anticipada', 'no_marcacion')");
                    table.CheckConstraint("CK_AttendanceIncidents_Status", "[Status] IN ('open', 'justified', 'rejected', 'expired')");
                    table.ForeignKey(
                        name: "FK_AttendanceIncidents_AttendanceRecords_AttendanceRecordId",
                        column: x => x.AttendanceRecordId,
                        principalTable: "AttendanceRecords",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AttendanceIncidents_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceIncidents_AttendanceRecordId",
                table: "AttendanceIncidents",
                column: "AttendanceRecordId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceIncidents_EmployeeId_IncidentDate",
                table: "AttendanceIncidents",
                columns: new[] { "EmployeeId", "IncidentDate" });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceIncidents_Status",
                table: "AttendanceIncidents",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AttendanceIncidents");
        }
    }
}
