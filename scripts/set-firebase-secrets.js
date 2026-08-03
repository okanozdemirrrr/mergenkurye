const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const text = fs.readFileSync('.env.local', 'utf8')
const line = text.split(/\r?\n/).find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='))
if (!line) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY bulunamadı')

let value = line.slice('FIREBASE_SERVICE_ACCOUNT_KEY='.length).trim()
if (value.startsWith('"') && value.endsWith('"')) {
  value = value.slice(1, -1)
}

// Validate JSON
const parsed = JSON.parse(value)
if (!parsed.private_key || !parsed.client_email) {
  throw new Error('JSON içinde private_key/client_email yok')
}

// supabase secrets set --env-file expects KEY=VALUE lines (no outer quotes needed if we escape carefully)
// Use JSON.stringify so the whole value is one valid JSON string for the secret
const compact = JSON.stringify(parsed)

const envFile = path.join('scripts', '.firebase-secrets.env')
const content =
  `FIREBASE_PROJECT_ID=alda-gel-kurye-d0537\n` +
  `FIREBASE_SERVICE_ACCOUNT_KEY=${compact}\n`

fs.writeFileSync(envFile, content, 'utf8')

try {
  execFileSync(
    'npx',
    ['supabase', 'secrets', 'set', '--env-file', envFile, '--project-ref', 'otrjbpwirwgrxmezyuwg'],
    { stdio: 'inherit', shell: true }
  )
  console.log('OK: Firebase secrets set via --env-file')
} finally {
  fs.unlinkSync(envFile)
}
