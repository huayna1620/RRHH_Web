using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Phase3_PayrollEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAtUtc",
                table: "PayrollRecords",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApprovedBy",
                table: "PayrollRecords",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "IncidentDeductions",
                table: "PayrollRecords",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "LoanDeductions",
                table: "PayrollRecords",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ManualDeductions",
                table: "PayrollRecords",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaidAtUtc",
                table: "PayrollRecords",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaidBy",
                table: "PayrollRecords",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "PayrollRecords",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "PayrollConcepts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    FixedAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Percentage = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    IsAutomatic = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollConcepts", x => x.Id);
                    table.CheckConstraint("CK_PayrollConcepts_Type", "[Type] IN ('earning', 'deduction')");
                });

            migrationBuilder.CreateTable(
                name: "PayrollLoans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LoanType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MonthlyInstallment = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalInstallments = table.Column<int>(type: "int", nullable: false),
                    PaidInstallments = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollLoans", x => x.Id);
                    table.CheckConstraint("CK_PayrollLoans_LoanType", "[LoanType] IN ('loan', 'advance')");
                    table.CheckConstraint("CK_PayrollLoans_TotalAmount", "[TotalAmount] > 0");
                    table.CheckConstraint("CK_PayrollLoans_TotalInstallments", "[TotalInstallments] >= 1");
                    table.ForeignKey(
                        name: "FK_PayrollLoans_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PayrollLoanInstallments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PayrollLoanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InstallmentNumber = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsPaid = table.Column<bool>(type: "bit", nullable: false),
                    PaidAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PayrollLoanInstallments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PayrollLoanInstallments_PayrollLoans_PayrollLoanId",
                        column: x => x.PayrollLoanId,
                        principalTable: "PayrollLoans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_PayrollRecords_Status",
                table: "PayrollRecords",
                sql: "[Status] IN ('draft', 'approved', 'paid')");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollConcepts_Code",
                table: "PayrollConcepts",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PayrollLoanInstallments_PayrollLoanId_InstallmentNumber",
                table: "PayrollLoanInstallments",
                columns: new[] { "PayrollLoanId", "InstallmentNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PayrollLoanInstallments_Year_Month",
                table: "PayrollLoanInstallments",
                columns: new[] { "Year", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_PayrollLoans_EmployeeId",
                table: "PayrollLoans",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PayrollConcepts");

            migrationBuilder.DropTable(
                name: "PayrollLoanInstallments");

            migrationBuilder.DropTable(
                name: "PayrollLoans");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PayrollRecords_Status",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "ApprovedAtUtc",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "ApprovedBy",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "IncidentDeductions",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "LoanDeductions",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "ManualDeductions",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "PaidAtUtc",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "PaidBy",
                table: "PayrollRecords");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "PayrollRecords");
        }
    }
}
