const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("--- Couriers ---");
    const { data: cData } = await supabase.from('couriers').select('*').limit(1);
    console.log(JSON.stringify(cData, null, 2));

    console.log("--- Restaurants ---");
    const { data: rData } = await supabase.from('restaurants').select('*').limit(1);
    console.log(JSON.stringify(rData, null, 2));
}
main();
