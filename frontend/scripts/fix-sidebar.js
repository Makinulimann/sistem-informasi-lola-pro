const url = 'https://wtnnvlibowwffgtjzoou.supabase.co/rest/v1/sidebar_menus';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
};

async function fixSidebar() {
    console.log('Fetching existing sidebar menus...');
    // 1. Fetch all
    const res = await fetch(`${url}?select=*`, { headers });
    if (!res.ok) throw new Error(await res.text());
    const menus = await res.json();
    
    // 2. Find and delete all 'RKAP'
    const toDelete = menus.filter(m => m.label === 'RKAP' || m.Label === 'RKAP');
    for (const m of toDelete) {
        console.log(`Deleting RKAP menu with id: ${m.id}`);
        await fetch(`${url}?id=eq.${m.id}`, { method: 'DELETE', headers });
    }
    
    // 3. Find parent 'Produk Pengembangan'
    const parent = menus.find(m => m.label === 'Produk Pengembangan' || m.Label === 'Produk Pengembangan');
    if (!parent) {
        console.error("Could not find 'Produk Pengembangan' menu");
        return;
    }
    
    // 4. Check if we already have RKAP / RKO
    const existingRko = menus.find(m => 
        (m.parent_id === parent.id || m.ParentId === parent.id) && 
        (m.label === 'RKAP / RKO' || m.Label === 'RKAP / RKO')
    );
    
    if (existingRko) {
        console.log("RKAP / RKO already exists under Produk Pengembangan");
        return;
    }
    
    // 5. Insert new 'RKAP / RKO'
    const children = menus.filter(m => m.parent_id === parent.id || m.ParentId === parent.id);
    const maxOrder = children.reduce((max, c) => Math.max(max, c.order || c.Order || 0), 0);
    
    console.log(`Inserting RKAP / RKO under ${parent.label} with order ${maxOrder + 1}`);
    const rkoItem = {
        label: 'RKAP / RKO',
        icon: 'layers',
        href: '/dashboard/rkap',
        parent_id: parent.id,
        order: maxOrder + 1,
        is_active: true,
        role_access: 'All'
    };
    
    const insertRes = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(rkoItem)
    });
    
    if (!insertRes.ok) {
        console.error("Failed to insert RKAP / RKO", await insertRes.text());
    } else {
        console.log("Successfully inserted RKAP / RKO");
    }
}

fixSidebar().then(() => console.log('Done')).catch(console.error);
