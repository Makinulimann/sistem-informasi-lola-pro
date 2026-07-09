const url = 'https://wtnnvlibowwffgtjzoou.supabase.co/rest/v1/sidebar_menus';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
};

async function reorderMenus() {
    // 1. Update tes order to 5
    console.log("Updating 'tes' menu (ID: 18) order to 5...");
    await fetch(`${url}?id=eq.18`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ order: 5 })
    });

    // 2. Update Aktivitas Harian order to 1000
    console.log("Updating 'Aktivitas Harian' (ID: 201) order to 1000...");
    await fetch(`${url}?id=eq.201`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ order: 1000 })
    });

    // 3. Update Maintenance order to 1001
    console.log("Updating 'Maintenance' (ID: 202) order to 1001...");
    await fetch(`${url}?id=eq.202`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ order: 1001 })
    });

    // 4. Update RKAP / RKO order to 1002
    console.log("Updating 'RKAP / RKO' (ID: 1) order to 1002...");
    await fetch(`${url}?id=eq.1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ order: 1002 })
    });

    // 5. Update Rencana Pengadaan order to 1003
    console.log("Updating 'Rencana Pengadaan' (ID: 2) order to 1003...");
    await fetch(`${url}?id=eq.2`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ order: 1003 })
    });

    console.log('Reordering completed successfully!');
}

reorderMenus().catch(console.error);
