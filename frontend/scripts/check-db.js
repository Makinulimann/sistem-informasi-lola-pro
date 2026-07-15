const supabaseUrl = 'https://wtnnvlibowwffgtjzoou.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0bm52bGlib3d3ZmZndGp6b291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM2MzgsImV4cCI6MjA4ODk1OTYzOH0.XxR1BNfFpVhId1nOSMfmvxvcVPi5SBE3JQG-BZJIvwU';

async function run() {
    console.log('Inserting dummy row to get full representation...');
    // We try to insert an empty object or a minimal object to see what fields are returned
    const res = await fetch(`${supabaseUrl}/rest/v1/bill_of_materials`, {
        method: 'POST',
        headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({})
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    // Clean up if it inserted
    if (res.status === 201 && Array.isArray(data) && data.length > 0 && data[0].id) {
        console.log('Cleaning up inserted dummy row...');
        await fetch(`${supabaseUrl}/rest/v1/bill_of_materials?id=eq.${data[0].id}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
            }
        });
    }
}

run().catch(console.error);
