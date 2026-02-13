using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SIPPro.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBahanBakuEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Materials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductSlug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Nama = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Materials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Perusahaans",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nama = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Perusahaans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BahanBakus",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipe = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    ProductSlug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PerusahaanId = table.Column<int>(type: "integer", nullable: false),
                    Tanggal = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Jenis = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NamaBahan = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Kuantum = table.Column<double>(type: "double precision", nullable: false),
                    Dokumen = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Keterangan = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BahanBakus", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BahanBakus_Perusahaans_PerusahaanId",
                        column: x => x.PerusahaanId,
                        principalTable: "Perusahaans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BalanceStoks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductSlug = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PerusahaanId = table.Column<int>(type: "integer", nullable: false),
                    Tanggal = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Produksi = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BalanceStoks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BalanceStoks_Perusahaans_PerusahaanId",
                        column: x => x.PerusahaanId,
                        principalTable: "Perusahaans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BalanceStokDetails",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BalanceStokId = table.Column<int>(type: "integer", nullable: false),
                    MaterialId = table.Column<int>(type: "integer", nullable: false),
                    Out = table.Column<double>(type: "double precision", nullable: false),
                    In = table.Column<double>(type: "double precision", nullable: false),
                    StokAkhir = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BalanceStokDetails", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BalanceStokDetails_BalanceStoks_BalanceStokId",
                        column: x => x.BalanceStokId,
                        principalTable: "BalanceStoks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BalanceStokDetails_Materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "Materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BahanBakus_PerusahaanId",
                table: "BahanBakus",
                column: "PerusahaanId");

            migrationBuilder.CreateIndex(
                name: "IX_BalanceStokDetails_BalanceStokId",
                table: "BalanceStokDetails",
                column: "BalanceStokId");

            migrationBuilder.CreateIndex(
                name: "IX_BalanceStokDetails_MaterialId",
                table: "BalanceStokDetails",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_BalanceStoks_PerusahaanId",
                table: "BalanceStoks",
                column: "PerusahaanId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BahanBakus");

            migrationBuilder.DropTable(
                name: "BalanceStokDetails");

            migrationBuilder.DropTable(
                name: "BalanceStoks");

            migrationBuilder.DropTable(
                name: "Materials");

            migrationBuilder.DropTable(
                name: "Perusahaans");
        }
    }
}
