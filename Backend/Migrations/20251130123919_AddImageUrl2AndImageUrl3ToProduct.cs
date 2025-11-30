using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ModernIssues.Migrations
{
    /// <inheritdoc />
    public partial class AddImageUrl2AndImageUrl3ToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "image_url_2",
                table: "products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "image_url_3",
                table: "products",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "image_url_2",
                table: "products");

            migrationBuilder.DropColumn(
                name: "image_url_3",
                table: "products");
        }
    }
}
