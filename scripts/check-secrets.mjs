import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const values = [];
if (existsSync('.env.local'))
  for (const line of (await readFile('.env.local', 'utf8')).split('\n')) {
    const m = line.match(
      /^(RESEND_API_KEY|SUPABASE_SECRET_KEY|CRON_SECRET|RATE_LIMIT_SECRET)=(.+)$/,
    );
    if (m && m[2].length > 8) values.push(m[2]);
  }
const skip = new Set([
  'node_modules',
  '.git',
  '.next',
  '.test-pg',
  'playwright-report',
  'test-results',
]);
const leaks = [];
async function walk(dir, client = false) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(entry.name) && !client) continue;
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(path, client);
    else if (
      entry.name !== '.env.local' &&
      !entry.name.startsWith('.env.') &&
      !entry.name.endsWith('.woff2')
    ) {
      const data = await readFile(path);
      if (values.some((value) => data.includes(Buffer.from(value)))) leaks.push(path);
    }
  }
}
await walk('.');
if (existsSync('.next/static')) await walk('.next/static', true);
if (leaks.length) {
  console.error('Credential content detected in:', ...leaks);
  process.exitCode = 1;
} else
  console.log('No configured server secret found in deliverable source or client build assets.');
