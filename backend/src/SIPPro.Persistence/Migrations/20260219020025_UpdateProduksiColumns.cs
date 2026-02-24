using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SIPPro.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProduksiColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Keluar",
                table: "Produksis",
                newName: "PG");

            migrationBuilder.RenameColumn(
                name: "JumlahProduksi",
                table: "Produksis",
                newName: "BS");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PG",
                table: "Produksis",
                newName: "Keluar");

            migrationBuilder.RenameColumn(
                name: "BS",
                table: "Produksis",
                newName: "JumlahProduksi");
        }
    }
}
