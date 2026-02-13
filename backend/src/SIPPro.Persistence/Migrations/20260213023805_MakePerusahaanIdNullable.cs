using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SIPPro.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakePerusahaanIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BahanBakus_Perusahaans_PerusahaanId",
                table: "BahanBakus");

            migrationBuilder.DropForeignKey(
                name: "FK_BalanceStoks_Perusahaans_PerusahaanId",
                table: "BalanceStoks");

            migrationBuilder.AlterColumn<int>(
                name: "PerusahaanId",
                table: "BalanceStoks",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "PerusahaanId",
                table: "BahanBakus",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_BahanBakus_Perusahaans_PerusahaanId",
                table: "BahanBakus",
                column: "PerusahaanId",
                principalTable: "Perusahaans",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_BalanceStoks_Perusahaans_PerusahaanId",
                table: "BalanceStoks",
                column: "PerusahaanId",
                principalTable: "Perusahaans",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BahanBakus_Perusahaans_PerusahaanId",
                table: "BahanBakus");

            migrationBuilder.DropForeignKey(
                name: "FK_BalanceStoks_Perusahaans_PerusahaanId",
                table: "BalanceStoks");

            migrationBuilder.AlterColumn<int>(
                name: "PerusahaanId",
                table: "BalanceStoks",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "PerusahaanId",
                table: "BahanBakus",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BahanBakus_Perusahaans_PerusahaanId",
                table: "BahanBakus",
                column: "PerusahaanId",
                principalTable: "Perusahaans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BalanceStoks_Perusahaans_PerusahaanId",
                table: "BalanceStoks",
                column: "PerusahaanId",
                principalTable: "Perusahaans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
