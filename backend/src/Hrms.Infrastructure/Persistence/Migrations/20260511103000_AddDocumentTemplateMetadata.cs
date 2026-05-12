using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hrms.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentTemplateMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "DocumentTemplates",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Format",
                table: "DocumentTemplates",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "html");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresEmployeeSignature",
                table: "DocumentTemplates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RequiresHrSignature",
                table: "DocumentTemplates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "VariablesJson",
                table: "DocumentTemplates",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentTemplates_Type_Category",
                table: "DocumentTemplates",
                columns: new[] { "Type", "Category" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DocumentTemplates_Type_Category",
                table: "DocumentTemplates");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "DocumentTemplates");

            migrationBuilder.DropColumn(
                name: "Format",
                table: "DocumentTemplates");

            migrationBuilder.DropColumn(
                name: "RequiresEmployeeSignature",
                table: "DocumentTemplates");

            migrationBuilder.DropColumn(
                name: "RequiresHrSignature",
                table: "DocumentTemplates");

            migrationBuilder.DropColumn(
                name: "VariablesJson",
                table: "DocumentTemplates");
        }
    }
}
