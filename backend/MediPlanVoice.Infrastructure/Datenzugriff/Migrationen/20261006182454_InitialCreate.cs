using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MediPlanVoice.Infrastructure.Datenzugriff.Migrationen
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Medizingeraete",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Medizingeraete", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Raeume",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Kapazitaet = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Raeume", x => x.Id);
                    table.CheckConstraint("CK_Raeume_Kapazitaet", "\"Kapazitaet\" >= 0");
                });

            migrationBuilder.CreateTable(
                name: "Buchungen",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Beginn = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Ende = table.Column<DateTime>(type: "TEXT", nullable: false),
                    RaumId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Buchungen", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Buchungen_Raeume_RaumId",
                        column: x => x.RaumId,
                        principalTable: "Raeume",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BuchungMedizingeraete",
                columns: table => new
                {
                    BuchungId = table.Column<int>(type: "INTEGER", nullable: false),
                    MedizingeraetId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BuchungMedizingeraete", x => new { x.BuchungId, x.MedizingeraetId });
                    table.ForeignKey(
                        name: "FK_BuchungMedizingeraete_Buchungen_BuchungId",
                        column: x => x.BuchungId,
                        principalTable: "Buchungen",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BuchungMedizingeraete_Medizingeraete_MedizingeraetId",
                        column: x => x.MedizingeraetId,
                        principalTable: "Medizingeraete",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Medizingeraete",
                columns: new[] { "Id", "Name" },
                values: new object[,]
                {
                    { 1, "Ultraschallgeraet" },
                    { 2, "EKG" },
                    { 3, "Patientenmonitor" }
                });

            migrationBuilder.InsertData(
                table: "Raeume",
                columns: new[] { "Id", "Kapazitaet", "Name" },
                values: new object[,]
                {
                    { 1, 2, "Behandlungsraum 1" },
                    { 2, 3, "Untersuchungsraum" },
                    { 3, 1, "Notfallraum" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Buchungen_RaumId",
                table: "Buchungen",
                column: "RaumId");

            migrationBuilder.CreateIndex(
                name: "IX_BuchungMedizingeraete_MedizingeraetId",
                table: "BuchungMedizingeraete",
                column: "MedizingeraetId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BuchungMedizingeraete");

            migrationBuilder.DropTable(
                name: "Buchungen");

            migrationBuilder.DropTable(
                name: "Medizingeraete");

            migrationBuilder.DropTable(
                name: "Raeume");
        }
    }
}
