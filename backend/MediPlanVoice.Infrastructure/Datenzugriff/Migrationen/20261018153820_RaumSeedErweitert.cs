using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MediPlanVoice.Infrastructure.Datenzugriff.Migrationen
{
    /// <inheritdoc />
    public partial class RaumSeedErweitert : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 1,
                column: "Standort",
                value: "Hauptgebäude");

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Name", "Standort" },
                values: new object[] { "Untersuchungsraum 1", "Hauptgebäude" });

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Kapazitaet", "Name", "Standort" },
                values: new object[] { 2, "Notfallraum 1", "Nebengebäude" });

            migrationBuilder.InsertData(
                table: "Raeume",
                columns: new[] { "Id", "Aktiv", "Kapazitaet", "Name", "Standort" },
                values: new object[,]
                {
                    { 4, true, 2, "Behandlungsraum 2", "Hauptgebäude" },
                    { 5, true, 2, "Behandlungsraum 3", "Nebengebäude" },
                    { 6, true, 3, "Untersuchungsraum 2", "Hauptgebäude" },
                    { 7, true, 3, "Untersuchungsraum 3", "Nebengebäude" },
                    { 8, true, 2, "Ultraschallraum", "Hauptgebäude" },
                    { 9, true, 2, "EKG-Raum", "Hauptgebäude" },
                    { 10, true, 2, "Notfallraum 2", "Nebengebäude" },
                    { 11, true, 2, "Verbandsraum", "Nebengebäude" },
                    { 12, true, 2, "Injektionsraum", "Hauptgebäude" },
                    { 13, true, 4, "Infusionsraum", "Nebengebäude" },
                    { 14, true, 3, "Laborraum", "Hauptgebäude" },
                    { 15, true, 2, "Blutentnahmeraum 1", "Hauptgebäude" },
                    { 16, true, 2, "Blutentnahmeraum 2", "Nebengebäude" },
                    { 17, true, 3, "Diagnostikraum 1", "Hauptgebäude" },
                    { 18, true, 3, "Diagnostikraum 2", "Nebengebäude" },
                    { 19, true, 2, "Vorbereitungsraum", "Hauptgebäude" },
                    { 20, true, 3, "Nachsorgeraum", "Nebengebäude" },
                    { 21, true, 1, "Isolationsraum", "Nebengebäude" },
                    { 22, true, 4, "Aufwachraum", "Hauptgebäude" },
                    { 23, true, 3, "Funktionsraum", "Hauptgebäude" },
                    { 24, true, 6, "Besprechungsraum", "Nebengebäude" },
                    { 25, true, 6, "Mehrzweckraum", "Nebengebäude" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 25);

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
                columns: new[] { "Name", "Standort" },
                values: new object[] { "Untersuchungsraum", "Hauptgebaeude" });

            migrationBuilder.UpdateData(
                table: "Raeume",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Kapazitaet", "Name", "Standort" },
                values: new object[] { 1, "Notfallraum", "Nebengebaeude" });
        }
    }
}
