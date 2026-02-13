using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SIPPro.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScopeProductSlugToMasterItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ScopeProductSlug",
                table: "MasterItems",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScopeProductSlug",
                table: "MasterItems");
        }
    }
}
