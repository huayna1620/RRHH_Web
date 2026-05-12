using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [Migration("20260511170000_AddBranchOperationalMetadata")]
    public partial class AddBranchOperationalMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Branches",
                type: "nvarchar(220)",
                maxLength: 220,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BranchType",
                table: "Branches",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Administrativa");

            migrationBuilder.AddColumn<string>(
                name: "BusinessHours",
                table: "Branches",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Capacity",
                table: "Branches",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Branches",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CostCenter",
                table: "Branches",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Branches",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "Perú");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Branches",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Branches",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OpenedAtUtc",
                table: "Branches",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Branches",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Region",
                table: "Branches",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresApprovalForChanges",
                table: "Branches",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ResponsibleName",
                table: "Branches",
                type: "nvarchar(140)",
                maxLength: 140,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponsibleTitle",
                table: "Branches",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "VisibleForAssignments",
                table: "Branches",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Address", table: "Branches");
            migrationBuilder.DropColumn(name: "BranchType", table: "Branches");
            migrationBuilder.DropColumn(name: "BusinessHours", table: "Branches");
            migrationBuilder.DropColumn(name: "Capacity", table: "Branches");
            migrationBuilder.DropColumn(name: "City", table: "Branches");
            migrationBuilder.DropColumn(name: "CostCenter", table: "Branches");
            migrationBuilder.DropColumn(name: "Country", table: "Branches");
            migrationBuilder.DropColumn(name: "Description", table: "Branches");
            migrationBuilder.DropColumn(name: "Email", table: "Branches");
            migrationBuilder.DropColumn(name: "OpenedAtUtc", table: "Branches");
            migrationBuilder.DropColumn(name: "Phone", table: "Branches");
            migrationBuilder.DropColumn(name: "Region", table: "Branches");
            migrationBuilder.DropColumn(name: "RequiresApprovalForChanges", table: "Branches");
            migrationBuilder.DropColumn(name: "ResponsibleName", table: "Branches");
            migrationBuilder.DropColumn(name: "ResponsibleTitle", table: "Branches");
            migrationBuilder.DropColumn(name: "VisibleForAssignments", table: "Branches");
        }
    }
}
