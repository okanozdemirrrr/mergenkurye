const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Kurye ID'yi al
    const { data, error } = await supabase.from('couriers').select('id, username').eq('username', 'asaf').single();
    if (error || !data) {
        console.error("Asaf bulunamadı.");
        return;
    }
    
    console.log(`Buldum: ${data.username} (ID: ${data.id})`);
    
    // Vercel'e push gönder
    const response = await fetch('https://mergenkuryesistem.vercel.app/api/send-push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            courierId: data.id,
            title: "Test",
            body: "Vercel API test ediliyor"
        })
    });
    
    const text = await response.text();
    console.log(`HTTP ${response.status}`);
    console.log(text);
}
main();
