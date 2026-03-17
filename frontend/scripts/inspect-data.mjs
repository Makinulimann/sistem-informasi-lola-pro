import pg from 'pg';

const oldDb = new pg.Client({
    host: 'localhost',
    port: 5432,
    database: 'sippro_db',
    user: 'sippro',
    password: 'sippro_dev_2024'
});

async function inspectData() {
    await oldDb.connect();

    console.log('--- Product Slugs in ProductMaterials ---');
    const res1 = await oldDb.query('SELECT DISTINCT "ProductSlug" FROM "ProductMaterials"');
    res1.rows.forEach(r => console.log(`[${r.ProductSlug}]`));

    console.log('\n--- MasterItems Data ---');
    const res2 = await oldDb.query('SELECT * FROM "MasterItems" LIMIT 5');
    console.log(res2.rows);

    console.log('\n--- Materials Data ---');
    const res3 = await oldDb.query('SELECT * FROM "Materials" LIMIT 5');
    console.log(res3.rows);

    await oldDb.end();
}

inspectData().catch(console.error);
