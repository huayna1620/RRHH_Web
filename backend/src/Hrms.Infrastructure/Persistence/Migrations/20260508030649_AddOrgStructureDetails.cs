using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrgStructureDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AreaId",
                table: "Positions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Positions",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Positions",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Areas",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ResponsibleEmployeeId",
                table: "Areas",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Positions_AreaId",
                table: "Positions",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_Areas_ResponsibleEmployeeId",
                table: "Areas",
                column: "ResponsibleEmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Areas_Employees_ResponsibleEmployeeId",
                table: "Areas",
                column: "ResponsibleEmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Positions_Areas_AreaId",
                table: "Positions",
                column: "AreaId",
                principalTable: "Areas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Areas_Employees_ResponsibleEmployeeId",
                table: "Areas");

            migrationBuilder.DropForeignKey(
                name: "FK_Positions_Areas_AreaId",
                table: "Positions");

            migrationBuilder.DropIndex(
                name: "IX_Positions_AreaId",
                table: "Positions");

            migrationBuilder.DropIndex(
                name: "IX_Areas_ResponsibleEmployeeId",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "AreaId",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "ResponsibleEmployeeId",
                table: "Areas");
        }
    }
}
