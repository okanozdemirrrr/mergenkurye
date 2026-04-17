const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://otrjbpwirwgrxmezyuwg.supabase.co';
const supabaseKey = 'sb_publishable_ZCcSWwHpTLAH7-yDSh1dqA_1C2krw19'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.from('users').select('username, password, user_type');
    if (error) {
        console.error("Error:", error);
        return;
    }
    const asafUser = data && data.find(u => u.username === 'asaf');
    console.log("All usernames:", data ? data.map(u => u.username).join(', ') : 'No data');
    console.log("Asaf user details:", asafUser ? JSON.stringify(asafUser, null, 2) : "NOT FOUND");
}
main();
