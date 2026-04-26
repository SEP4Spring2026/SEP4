using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainServer.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Sensors",
                columns: table => new
                {
                    SensorId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sensors", x => x.SensorId);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Readings",
                columns: table => new
                {
                    ReadingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Temperature = table.Column<double>(type: "double", nullable: false),
                    Humidity = table.Column<double>(type: "double", nullable: false),
                    Co2Level = table.Column<double>(type: "double", nullable: false),
                    SmokeLevel = table.Column<double>(type: "double", nullable: true),
                    SensorId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Readings", x => x.ReadingId);
                    table.ForeignKey(
                        name: "FK_Readings_Sensors_SensorId",
                        column: x => x.SensorId,
                        principalTable: "Sensors",
                        principalColumn: "SensorId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Predictions",
                columns: table => new
                {
                    PredictionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PredictionTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    PredictedCategory = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ConfidenceScore = table.Column<double>(type: "double", nullable: false),
                    RiskLevel = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReadingId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Predictions", x => x.PredictionId);
                    table.ForeignKey(
                        name: "FK_Predictions_Readings_ReadingId",
                        column: x => x.ReadingId,
                        principalTable: "Readings",
                        principalColumn: "ReadingId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Predictions_ReadingId",
                table: "Predictions",
                column: "ReadingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Readings_SensorId",
                table: "Readings",
                column: "SensorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Predictions");

            migrationBuilder.DropTable(
                name: "Readings");

            migrationBuilder.DropTable(
                name: "Sensors");
        }
    }
}
