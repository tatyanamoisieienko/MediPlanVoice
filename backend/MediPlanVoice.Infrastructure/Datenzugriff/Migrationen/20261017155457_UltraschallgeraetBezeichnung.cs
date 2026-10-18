using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediPlanVoice.Infrastructure.Datenzugriff.Migrationen
{
    /// <inheritdoc />
    public partial class UltraschallgeraetBezeichnung : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 1,
                column: "Name",
                value: "Ultraschallgerät");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Medizingeraete",
                keyColumn: "Id",
                keyValue: 1,
                column: "Name",
                value: "Ultraschallgeraet");
        }
    }
}
