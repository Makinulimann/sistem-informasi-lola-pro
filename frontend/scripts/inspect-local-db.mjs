import pg from 'pg';
import fs from 'fs';

const oldDb = new pg.Client({
    host: 'localhost',
    port: 5432,
    database: 'sippro_db',
    user: 'sippro',
    password: 'sippro_dev_2024'
});

async function inspect() {
    await oldDb.connect();
    let log = 'Database Inspection\n===================\n';

    const tablesRes = await oldDb.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

    const tables = tablesRes.rows.map(r => r.table_name);
    log += `Found tables: ${tables.join(', ')}\n`;

    for (const table of tables) {
        log += `\nTable: "${table}"\n`;
        try {
            const colRes = await oldDb.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `);
            colRes.rows.forEach(col => {
                log += `  - ${col.column_name} (${col.data_type})\n`;
            });

            const countRes = await oldDb.query(`SELECT COUNT(*) FROM "${table}"`);
            log += `  Count: ${countRes.rows[0].count}\n`;
        } catch (err) {
            log += `  Error: ${err.message}\n`;
        }
    }

    fs.writeFileSync('scripts/db-inspect.log', log);
    await oldDb.end();
    console.log('Inspection complete. Log saved to scripts/db-inspect.log');
}

inspect().catch(console.error);
