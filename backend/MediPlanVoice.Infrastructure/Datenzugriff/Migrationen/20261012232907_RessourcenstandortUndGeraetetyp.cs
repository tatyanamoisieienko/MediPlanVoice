using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediPlanVoice.Infrastructure.Datenzugriff.Migrationen
{
    /// <inheritdoc />
    public partial class RessourcenstandortUndGeraetetyp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Standort",
                table: "Raeume",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Geraetetyp",
                table: "Medizingeraete",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Standort",
                table: "Medizingeraete",
                type: "TEXT",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Geraetetyp", "Standort" },
                values: new object[] { "Bildgebung", "Hauptgebaeude" });

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Geraetetyp", "Standort" },
                values: new object[] { "Diagnostik", "Hauptgebaeude" });

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Geraetetyp", "Standort" },
                values: new object[] { "Ueberwachung", "Nebengebaeude" });

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 1,
                column: "Standort",
                value: "Hauptgebaeude");

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 2,
                column: "Standort",
                value: "Hauptgebaeude");

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 3,
                column: "Standort",
                value: "Nebengebaeude");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Standort",
                table: "Raeume");

            migrationBuilder.DropColumn(
                name: "Geraetetyp",
                table: "Medizingeraete");

            migrationBuilder.DropColumn(
                name: "Standort",
                table: "Medizingeraete");
        }
    }
}
