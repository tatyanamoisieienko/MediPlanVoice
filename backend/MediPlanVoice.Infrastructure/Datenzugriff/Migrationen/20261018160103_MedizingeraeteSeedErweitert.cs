using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MediPlanVoice.Infrastructure.Datenzugriff.Migrationen
{
    /// <inheritdoc />
    public partial class MedizingeraeteSeedErweitert : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 1,
                column: "Standort",
                value: "Hauptgebäude");

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 2,
                column: "Standort",
                value: "Hauptgebäude");

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Geraetetyp", "Standort" },
                values: new object[] { "Überwachung", "Nebengebäude" });

            migrationBuilder.InsertData(
                table: "Medizingeraete",
                columns: new[] { "Id", "Aktiv", "Geraetetyp", "Name", "Standort" },
                values: new object[,]
                {
                    { 4, true, "Notfallmedizin", "Defibrillator", "Nebengebäude" },
                    { 5, true, "Infusion", "Infusionspumpe", "Hauptgebäude" },
                    { 6, true, "Infusion", "Spritzenpumpe", "Nebengebäude" },
                    { 7, true, "Überwachung", "Pulsoximeter", "Hauptgebäude" },
                    { 8, true, "Überwachung", "Blutdruckmonitor", "Hauptgebäude" },
                    { 9, true, "Beatmung", "Beatmungsgerät", "Nebengebäude" },
                    { 10, true, "Notfallmedizin", "Absauggerät", "Hauptgebäude" },
                    { 11, true, "Messgerät", "Blutzuckermessgerät", "Nebengebäude" },
                    { 12, true, "Diagnostik", "Spirometer", "Hauptgebäude" },
                    { 13, true, "Bildgebung", "Mobiles Röntgengerät", "Nebengebäude" },
                    { 14, true, "Diagnostik", "Dopplergerät", "Nebengebäude" },
                    { 15, true, "Diagnostik", "EEG-Gerät", "Hauptgebäude" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 1,
                column: "Standort",
                value: "Hauptgebaeude");

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 2,
                column: "Standort",
                value: "Hauptgebaeude");

            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Geraetetyp", "Standort" },
                values: new object[] { "Ueberwachung", "Nebengebaeude" });
        }
    }
}
