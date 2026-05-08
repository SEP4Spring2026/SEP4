using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainServer.Migrations
{
    /// <inheritdoc />
    public partial class AddSensorPayloadFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Aqi",
                table: "Readings",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Classification",
                table: "Readings",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<double>(
                name: "Eco2",
                table: "Readings",
                type: "double",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Tvoc",
                table: "Readings",
                type: "double",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Aqi",
                table: "Readings");

            migrationBuilder.DropColumn(
                name: "Classification",
                table: "Readings");

            migrationBuilder.DropColumn(
                name: "Eco2",
                table: "Readings");

            migrationBuilder.DropColumn(
                name: "Tvoc",
                table: "Readings");
        }
    }
}
