using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase2_BusinessRulesAndValidations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_VacationRequests_Status",
                table: "VacationRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LeaveRequests_Status",
                table: "LeaveRequests");

            migrationBuilder.AddColumn<DateOnly>(
                name: "ContractEndDate",
                table: "Employees",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "Employees",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "Employees",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Holidays",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    IsRecurring = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Holidays", x => x.Id);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_VacationRequests_Status",
                table: "VacationRequests",
                sql: "[Status] IN ('pending','approved','rejected','cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LeaveRequests_Status",
                table: "LeaveRequests",
                sql: "[Status] IN ('pending','approved','rejected','cancelled')");

            migrationBuilder.CreateIndex(
                name: "IX_Holidays_Date_Name",
                table: "Holidays",
                columns: new[] { "Date", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Holidays");

            migrationBuilder.DropCheckConstraint(
                name: "CK_VacationRequests_Status",
                table: "VacationRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_LeaveRequests_Status",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "ContractEndDate",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "Employees");

            migrationBuilder.AddCheckConstraint(
                name: "CK_VacationRequests_Status",
                table: "VacationRequests",
                sql: "[Status] IN ('pending','approved','rejected')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_LeaveRequests_Status",
                table: "LeaveRequests",
                sql: "[Status] IN ('pending','approved','rejected')");
        }
    }
}
