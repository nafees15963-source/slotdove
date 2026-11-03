import { readFileSync, existsSync } from 'node:fs';
// Report presence only. Never print secret values or connection strings.
const local = {};
if (existsSync('.env.local'))
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) local[match[1]] = match[2];
  }
const present = (name) => Boolean(process.env[name] || local[name]);
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
];
const email = ['RESEND_API_KEY', 'EMAIL_FROM', 'CRON_SECRET'];
for (const name of [...required, ...email])
  console.log(`${present(name) ? 'SET    ' : 'MISSING'} ${name}`);
console.log(
  'This checks local configuration presence only; it does not verify a provider connection.',
);
if (required.some((n) => !present(n))) process.exitCode = 1;
