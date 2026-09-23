const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const line = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));

if (!line) {
  console.log('FIREBASE_SERVICE_ACCOUNT_KEY satiri bulunamadi');
  process.exit(1);
}

// Baştaki ve sondaki " işaretini kaldır
let val = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length);
if (val.startsWith('"')) val = val.slice(1);
if (val.endsWith('"')) val = val.slice(0, -1);

console.log('Value length:', val.length);
console.log('Starts with:', val.substring(0, 30));

try {
  const obj = JSON.parse(val);
  console.log('JSON PARSE OK');
  console.log('project_id:', obj.project_id);
  console.log('client_email:', obj.client_email);
  console.log('private_key exists:', !!obj.private_key);
  console.log('private_key starts with:', obj.private_key?.substring(0, 50));
} catch(e) {
  console.error('JSON PARSE ERROR:', e.message);
  // Hangi karakterde hata var
  const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
  if (pos > 0) {
    console.log('Error around position', pos, ':', JSON.stringify(val.substring(Math.max(0,pos-20), pos+20)));
  }
}
