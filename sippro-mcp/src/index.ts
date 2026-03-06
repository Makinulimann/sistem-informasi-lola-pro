import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Inisialisasi MCP Server
const server = new Server(
    {
        name: "sippro-mcp-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 1. Mendaftarkan Tools (Fungsi apa saja yang bisa dipanggil AI)
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_sidebar",
                description: "Mengambil daftar menu sidebar dari Backend SIPP (.NET)",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            // Anda bisa menambahkan tools lain di sini nanti, misalnya: get_aktivitas_harian, add_produksi, dll.
        ],
    };
});

// 2. Mengeksekusi Tools (Logika saat AI memanggil tool)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_sidebar") {
        try {
            // Memanggil API Backend .NET yang sedang berjalan di port 5062
            const response = await fetch("http://localhost:5062/api/sidebar");

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Gagal mengambil data dari Backend: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error(`Tool tidak dikenal: ${request.params.name}`);
});

// 3. Menjalankan Server menggunakan protokol Standard Input/Output (stdio)
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("SIPP MCP Server sedang berjalan dan terhubung via stdio");
}

run().catch(console.error);
