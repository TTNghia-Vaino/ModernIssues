using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ModernIssues.Migrations
{
    /// <inheritdoc />
    public partial class AddSpecificationsToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "history_json",
                table: "warranty_details",
                type: "TEXT",
                nullable: true,
                comment: "Lịch sử thay đổi trạng thái và ghi chú (JSON array)");

            migrationBuilder.AddColumn<bool>(
                name: "two_factor_enabled",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "two_factor_enabled_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "two_factor_method",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "two_factor_recovery_codes",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "two_factor_secret",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "local",
                table: "promotions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                defaultValue: "hero",
                comment: "Vị trí hiển thị promotion: hero (giữa trang chủ), left (bên trái), right (bên phải)");

            migrationBuilder.AddColumn<string>(
                name: "specifications",
                table: "products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_disabled",
                table: "categories",
                type: "boolean",
                nullable: true,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "history_json",
                table: "warranty_details");

            migrationBuilder.DropColumn(
                name: "two_factor_enabled",
                table: "users");

            migrationBuilder.DropColumn(
                name: "two_factor_enabled_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "two_factor_method",
                table: "users");

            migrationBuilder.DropColumn(
                name: "two_factor_recovery_codes",
                table: "users");

            migrationBuilder.DropColumn(
                name: "two_factor_secret",
                table: "users");

            migrationBuilder.DropColumn(
                name: "local",
                table: "promotions");

            migrationBuilder.DropColumn(
                name: "specifications",
                table: "products");

            migrationBuilder.DropColumn(
                name: "is_disabled",
                table: "categories");
        }
    }
}
