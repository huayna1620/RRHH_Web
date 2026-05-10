using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionReportsTo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReportsToEmployeeId",
                table: "Positions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Positions_ReportsToEmployeeId",
                table: "Positions",
                column: "ReportsToEmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Positions_Employees_ReportsToEmployeeId",
                table: "Positions",
                column: "ReportsToEmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Positions_Employees_ReportsToEmployeeId",
                table: "Positions");

            migrationBuilder.DropIndex(
                name: "IX_Positions_ReportsToEmployeeId",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "ReportsToEmployeeId",
                table: "Positions");
        }
    }
}
