const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.from('couriers').select('username, fcm_token').not('fcm_token', 'is', null);
    console.log("Tokeni olan kuryeler:");
    console.log(JSON.stringify(data, null, 2));
}
main();
