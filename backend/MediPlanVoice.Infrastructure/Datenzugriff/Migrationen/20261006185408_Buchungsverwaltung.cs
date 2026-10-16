using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediPlanVoice.Infrastructure.Datenzugriff.Migrationen
{
    /// <inheritdoc />
    public partial class Buchungsverwaltung : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Aktiv",
                table: "Raeume",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "Aktiv",
                table: "Medizingeraete",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Titel",
                table: "Buchungen",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "Bestandsbuchung");

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 1,
                column: "Aktiv",
                value: true);

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 2,
                column: "Aktiv",
                value: true);

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 3,
                column: "Aktiv",
                value: true);

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 1,
                column: "Aktiv",
                value: true);

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 2,
                column: "Aktiv",
                value: true);

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 3,
                column: "Aktiv",
                value: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Buchungen_BeginnVorEnde",
                table: "Buchungen",
                sql: "\"Beginn\" < \"Ende\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Buchungen_BeginnVorEnde",
                table: "Buchungen");

            migrationBuilder.DropColumn(
                name: "Aktiv",
                table: "Raeume");

            migrationBuilder.DropColumn(
                name: "Aktiv",
                table: "Medizingeraete");

            migrationBuilder.DropColumn(
                name: "Titel",
                table: "Buchungen");
        }
    }
}
