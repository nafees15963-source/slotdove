import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const server = new EmbeddedPostgres({
  databaseDir: '.test-pg',
  user: 'postgres',
  password: 'local-tests-only',
  port: 55439,
  persistent: false,
  onLog: () => {},
  onError: () => {},
});
const clients: Client[] = [];
let passed = 0;
async function connect() {
  const c = new Client({
    host: '127.0.0.1',
    port: 55439,
    user: 'postgres',
    password: 'local-tests-only',
    database: 'postgres',
  });
  await c.connect();
  clients.push(c);
  return c;
}
async function test(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
try {
  await server.initialise();
  await server.start();
  const db = await connect();
  await db.query(
    `create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon,service_role;`,
  );
  await db.query(
    'create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;',
  );
  for (const file of (await readdir('supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.query(await readFile(`supabase/migrations/${file}`, 'utf8'));
  console.log('PASS all migrations applied to PostgreSQL');
  passed++;
  const u1 = randomUUID(),
    u2 = randomUUID(),
    staffUser = randomUUID();
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)', [
    u1,
    'owner-a@example.test',
    u2,
    'owner-b@example.test',
    staffUser,
    'staff@example.test',
  ]);
  const b1 = (
    await db.query(
      "insert into businesses(owner_id,name,slug,email,min_notice_minutes) values($1,'Business A','business-a','a@example.test',0) returning id",
      [u1],
    )
  ).rows[0].id;
  const b2 = (
    await db.query(
      "insert into businesses(owner_id,name,slug,email) values($1,'Business B','business-b','b@example.test') returning id",
      [u2],
    )
  ).rows[0].id;
  const s = (
    await db.query(
      "insert into services(business_id,name,duration_minutes,buffer_after) values($1,'Consultation',30,15) returning id",
      [b1],
    )
  ).rows[0].id;
  const st = (
    await db.query(
      "insert into staff_profiles(business_id,name,user_id) values($1,'Team Member',$2) returning id",
      [b1, staffUser],
    )
  ).rows[0].id;
  await db.query('insert into service_staff values($1,$2,$3)', [b1, s, st]);
  await db.query(
    "insert into availability_rules(business_id,staff_id,weekday,starts,ends) select $1,$2,d,'08:00','18:00' from generate_series(0,6)d",
    [b1, st],
  );
  await db.query('update businesses set published=true where id=$1', [b1]);
  await db.query(
    "insert into customers(business_id,name,email) values($1,'Customer A','customer-a@example.test') returning id",
    [b1],
  );
  const c2 = (
    await db.query(
      "insert into customers(business_id,name,email) values($1,'Customer B','customer-b@example.test') returning id",
      [b2],
    )
  ).rows[0].id;
  const user = await connect();
  await user.query('set role authenticated');
  await user.query("select set_config('request.jwt.claim.sub',$1,false)", [u1]);
  await test('owner can plan without staff and assign later with schedule validation', async () => {
    const customer = (await user.query('select id from customers where business_id=$1', [b1])).rows[0].id;
    const booking = (await user.query("insert into bookings(business_id,service_id,customer_id,starts_at) values($1,$2,$3,date_trunc('day',now())+interval '10 days 10 hours') returning id,staff_id", [b1,s,customer])).rows[0];
    assert.equal(booking.staff_id, null);
    await user.query('update bookings set staff_id=$1 where id=$2', [st,booking.id]);
    assert.equal((await user.query('select staff_id from bookings where id=$1',[booking.id])).rows[0].staff_id,st);
    await user.query("update bookings set status='cancelled' where id=$1",[booking.id]);
    await assert.rejects(user.query('update bookings set staff_id=null where id=$1',[booking.id]));
    await user.query('delete from bookings where id=$1',[booking.id]);
  });
  await test('team can book walk-ins at any minute, outside hours, without email', async () => {
    const walkIn = (await user.query("insert into customers(business_id,name) values($1,'Walk-in') returning id", [b1])).rows[0].id;
    await db.query('update businesses set min_notice_minutes=600 where id=$1', [b1]);
    // 7 minutes from now: violates notice and the 15-minute grid, still allowed internally.
    const r = (await user.query("insert into bookings(business_id,service_id,staff_id,customer_id,starts_at) values($1,$2,$3,$4,date_trunc('minute',now())+interval '7 minutes') returning id,status", [b1, s, st, walkIn])).rows[0];
    assert.equal(r.status, 'confirmed');
    // Overlap protection still applies.
    await assert.rejects(user.query("insert into bookings(business_id,service_id,staff_id,customer_id,starts_at) values($1,$2,$3,$4,date_trunc('minute',now())+interval '10 minutes')", [b1, s, st, walkIn]), /bookings_no_overlap|exclusion/);
    await user.query("update bookings set status='cancelled' where id=$1", [r.id]);
    await user.query('delete from bookings where id=$1', [r.id]);
    await db.query('update businesses set min_notice_minutes=0 where id=$1', [b1]);
  });
  await test('week plan replacement is atomic and tenant scoped', async () => {
    await user.query('select replace_week_plan($1,$2,$3)', [b1, st, JSON.stringify([{ weekday: 1, starts: '09:00', ends: '12:00' }, { weekday: 1, starts: '13:00', ends: '18:00' }])]);
    assert.equal((await user.query('select * from availability_rules where staff_id=$1', [st])).rowCount, 2);
    await db.query("insert into availability_rules(business_id,staff_id,weekday,starts,ends) select $1,$2,d,'08:00','18:00' from generate_series(0,6)d on conflict do nothing", [b1, st]);
    await db.query("delete from availability_rules where staff_id=$1 and weekday=1 and starts in ('09:00','13:00')", [st]);
    const other = await connect();
    await other.query('set role authenticated');
    await other.query("select set_config('request.jwt.claim.sub',$1,false)", [u2]);
    await assert.rejects(other.query('select replace_week_plan($1,$2,$3)', [b1, st, '[]']), /FORBIDDEN/);
  });
  await test('chat, activity and reports are not readable by tenants directly', async () => {
    for (const t of ['messages', 'conversations', 'message_reports', 'activity_log', 'admin_business_notes'])
      await assert.rejects(user.query(`select * from ${t}`), /permission denied/);
  });
  await test('platform admin support session grants temporary owner access with audit', async () => {
    const admin = (await db.query("insert into auth.users(id,email) values(gen_random_uuid(),'admin@example.test') returning id")).rows[0].id;
    await db.query('insert into private.platform_admins(user_id) values($1)', [admin]);
    const a = await connect();
    await a.query('set role authenticated');
    await a.query("select set_config('request.jwt.claim.sub',$1,false)", [admin]);
    assert.equal((await a.query('select my_business_role($1) r', [b1])).rows[0].r, null);
    await db.query('select admin_support_session($1,$2,true)', [admin, b1]);
    assert.equal((await a.query('select my_business_role($1) r', [b1])).rows[0].r, 'owner');
    assert.equal((await a.query('select my_support_business() b')).rows[0].b, b1);
    await db.query('select admin_support_session($1,$2,false)', [admin, b1]);
    assert.equal((await a.query('select my_business_role($1) r', [b1])).rows[0].r, null);
    assert.equal((await db.query("select * from admin_audit_logs where action like 'support.%' and business_id=$1", [b1])).rowCount, 2);
    await assert.rejects(user.query('select admin_support_session($1,$2,true)', [u1, b1]));
  });
  await test('every booking gets a unique readable booking number', async () => {
    const customer = (await user.query('select id from customers where business_id=$1 limit 1', [b1])).rows[0].id;
    const r = (await user.query("insert into bookings(business_id,service_id,customer_id,starts_at) values($1,$2,$3,date_trunc('day',now())+interval '20 days 9 hours') returning id,booking_number", [b1, s, customer])).rows[0];
    assert.match(r.booking_number, /^SD-[2-9A-HJKMNP-Z]{6}$/);
    await user.query("update bookings set status='cancelled' where id=$1", [r.id]);
    await user.query('delete from bookings where id=$1', [r.id]);
  });
  await test('support tickets get sequential case numbers and stay server-only', async () => {
    const a = (await db.query("insert into support_tickets(business_id,user_id,subject) values($1,$2,'Hilfe bitte') returning case_number", [b1, u1])).rows[0].case_number;
    const b = (await db.query("insert into support_tickets(business_id,user_id,subject) values($1,$2,'Noch eine Frage') returning case_number", [b1, u1])).rows[0].case_number;
    assert.match(a, /^F-\d{4}-\d{5}$/);
    assert.ok(b > a);
    await assert.rejects(user.query('select * from support_tickets'), /permission denied/);
  });
  await test('tenant isolation: owner A cannot read owner B customers', async () => {
    const r = await user.query('select * from customers where business_id=$1', [b2]);
    assert.equal(r.rowCount, 0);
  });
  await test('tenant isolation: cannot update another business', async () => {
    const r = await user.query("update customers set name='Attacked' where id=$1", [c2]);
    assert.equal(r.rowCount, 0);
  });
  await test('tenant isolation: foreign-key ownership is enforced', async () => {
    await assert.rejects(
      user.query(
        "insert into bookings(business_id,service_id,staff_id,customer_id,starts_at) values($1,$2,$3,$4,now()+interval '1 day')",
        [b1, s, st, c2],
      ),
    );
  });
  await test('logo upload policies isolate business paths', async () => {
    await user.query("insert into storage.objects(bucket_id,name) values('business-logos',$1)", [
      b1 + '/example.png',
    ]);
    await assert.rejects(
      user.query("insert into storage.objects(bucket_id,name) values('business-logos',$1)", [
        b2 + '/example.png',
      ]),
      /row-level security/,
    );
  });
  await test('business owner cannot change platform status', async () => {
    await assert.rejects(
      user.query("update businesses set status='suspended' where id=$1", [b1]),
      /permission denied/,
    );
  });
  await test('ordinary user is not platform admin', async () => {
    assert.equal((await user.query('select public.my_platform_role() ok')).rows[0].ok, false);
  });
  await test('anonymous cannot enumerate bookings or call privileged RPC', async () => {
    const a = await connect();
    await a.query('set role anon');
    await assert.rejects(a.query('select * from bookings'), /permission denied/);
    await assert.rejects(
      a.query("select public.manage_booking('bad','view')"),
      /permission denied/,
    );
  });
  await test('staff cannot self-promote or read customer directory', async () => {
    await db.query("insert into business_members values($1,$2,'staff',now())", [b1, staffUser]);
    const a = await connect();
    await a.query('set role authenticated');
    await a.query("select set_config('request.jwt.claim.sub',$1,false)", [staffUser]);
    await assert.rejects(
      a.query("update business_members set role='admin' where user_id=$1", [staffUser]),
      /permission denied/,
    );
    assert.equal((await a.query('select * from customers')).rowCount, 0);
  });
  const start = (
    await db.query("select ((current_date+2)+time '10:00') at time zone 'Europe/Berlin' as t")
  ).rows[0].t.toISOString();
  const reserve = (client: Client, key: string, hash: string, startAt = start) =>
    client.query('select reserve_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r', [
      b1,
      s,
      st,
      startAt,
      'Guest Example',
      'guest@example.test',
      '',
      '',
      key,
      hash,
    ]);
  let bookingId: string;
  await test('concurrent slot reservations: exactly one succeeds', async () => {
    const x = await connect(),
      y = await connect();
    await x.query('set role service_role');
    await y.query('set role service_role');
    const r = await Promise.allSettled([
      reserve(x, randomUUID(), 'a'.repeat(64)),
      reserve(y, randomUUID(), 'b'.repeat(64)),
    ]);
    assert.equal(r.filter((v) => v.status === 'fulfilled').length, 1);
    const win = r.find((v) => v.status === 'fulfilled');
    if (win?.status === 'fulfilled') bookingId = win.value.rows[0].r.id;
  });
  await test('buffer blocks a seemingly adjacent appointment', async () => {
    await assert.rejects(
      reserve(
        db,
        randomUUID(),
        'c'.repeat(64),
        new Date(Date.parse(start) + 30 * 60000).toISOString(),
      ),
      /bookings_no_overlap/,
    );
  });
  await test('blocked time cannot overlap an existing booking', async () => {
    await assert.rejects(
      db.query(
        'insert into blocked_times(business_id,staff_id,starts_at,ends_at) values($1,$2,$3,$4)',
        [b1, st, start, new Date(Date.parse(start) + 3600000).toISOString()],
      ),
      /EXISTING_BOOKING_CONFLICT/,
    );
  });
  await test('cancellation releases capacity', async () => {
    await db.query("update bookings set status='cancelled' where id=$1", [bookingId]);
    const r = await reserve(db, randomUUID(), 'd'.repeat(64));
    assert.ok(r.rows[0].r.id);
  });
  await test('idempotency creates a single booking', async () => {
    const key = randomUUID(),
      hash = 'e'.repeat(64),
      t = new Date(Date.parse(start) + 3600000).toISOString();
    const a = await reserve(db, key, hash, t),
      b = await reserve(db, key, hash, t);
    assert.equal(a.rows[0].r.id, b.rows[0].r.id);
    assert.equal(
      (await db.query('select count(*)::int n from bookings where idempotency_key=$1', [key]))
        .rows[0].n,
      1,
    );
    await assert.rejects(reserve(db, key, 'f'.repeat(64), t), /IDEMPOTENCY_MISMATCH/);
  });
  await test('expired management token is rejected', async () => {
    await db.query(
      "update private.booking_management_tokens set expires_at=now()-interval '1 minute'",
    );
    await assert.rejects(
      db.query("select manage_booking($1,'view')", ['d'.repeat(64)]),
      /LINK_EXPIRED/,
    );
  });
  await test('terminal status cannot be revived', async () => {
    await assert.rejects(
      db.query("update bookings set status='confirmed' where id=$1", [bookingId]),
      /INVALID_TRANSITION/,
    );
  });
  await test('every exposed application table enables RLS', async () => {
    assert.equal(
      (
        await db.query(
          "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not relrowsecurity",
        )
      ).rowCount,
      0,
    );
  });
  await test('private helper definitions have fixed search_path', async () => {
    const r = await db.query(
      "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and prosecdef and not('search_path=\"\"'=any(proconfig))",
    );
    assert.equal(r.rowCount, 0);
  });

  await test('admin RPC cannot be executed by regular authenticated users', async () => {
    await assert.rejects(
      user.query("select admin_demo_action($1,$2,'reset')", [u1, b1]),
      /permission denied/,
    );
  });
  await db.query('insert into private.platform_admins(user_id) values($1)', [u1]);
  let demoId: string;
  await test('admin creates isolated demo data and suppresses email', async () => {
    demoId = (
      await db.query(
        "select admin_create_business($1,'Demo Studio','demo-studio','prospect@example.test','Europe/Berlin','en',true,'pro') id",
        [u1],
      )
    ).rows[0].id;
    assert.ok(demoId);
    const r = await db.query(
      "select count(*)::int n from notification_jobs where business_id=$1 and status<>'suppressed'",
      [demoId],
    );
    assert.equal(r.rows[0].n, 0);
    assert.ok(
      (
        await db.query('select count(*)::int n from customers where business_id=$1 and is_sample', [
          demoId,
        ])
      ).rows[0].n > 0,
    );
  });
  await test('demo reset is isolated and retains another tenant', async () => {
    const before = (
      await db.query('select count(*)::int n from bookings where business_id=$1', [b1])
    ).rows[0].n;
    await db.query("select admin_demo_action($1,$2,'reset')", [u1, demoId]);
    assert.equal(
      (await db.query('select count(*)::int n from bookings where business_id=$1', [b1])).rows[0].n,
      before,
    );
  });
  await test('demo conversion removes fictional contacts and appointments', async () => {
    await db.query("select admin_demo_action($1,$2,'convert')", [u1, demoId]);
    assert.equal(
      (await db.query('select is_demo from businesses where id=$1', [demoId])).rows[0].is_demo,
      false,
    );
    assert.equal(
      (
        await db.query('select count(*)::int n from customers where business_id=$1 and is_sample', [
          demoId,
        ])
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query('select count(*)::int n from bookings where business_id=$1 and is_sample', [
          demoId,
        ])
      ).rows[0].n,
      0,
    );
  });
  await test('invitation requires matching verified email and is single use', async () => {
    const hash = 'f'.repeat(64);
    await db.query("select create_invitation_server($1,'owner-b@example.test','admin',$2,$3)", [
      b1,
      hash,
      u1,
    ]);
    await assert.rejects(
      db.query('select accept_invitation_server($1,$2,$3)', [hash, u2, 'wrong@example.test']),
      /INVITATION_INVALID/,
    );
    assert.equal(
      (
        await db.query('select accept_invitation_server($1,$2,$3) id', [
          hash,
          u2,
          'owner-b@example.test',
        ])
      ).rows[0].id,
      b1,
    );
    await assert.rejects(
      db.query('select accept_invitation_server($1,$2,$3)', [hash, u2, 'owner-b@example.test']),
      /INVITATION_INVALID/,
    );
  });
  await test('manual plan assignment does not require Stripe', async () => {
    await db.query("select admin_update_business($1,'active','business',$2)", [b1, u1]);
    assert.equal(
      (await db.query('select plan_id from business_entitlements where business_id=$1', [b1]))
        .rows[0].plan_id,
      'business',
    );
    assert.equal(
      (
        await db.query('select external_subscription_id from subscriptions where business_id=$1', [
          b1,
        ])
      ).rows[0].external_subscription_id,
      null,
    );
  });

  await test('unverified account cannot create a tenant or inherit access', async () => {
    const uid = randomUUID();
    await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,null)', [
      uid,
      'unverified@example.test',
    ]);
    const unverified = await connect();
    await unverified.query('set role authenticated');
    await unverified.query("select set_config('request.jwt.claim.sub',$1,false)", [uid]);
    await assert.rejects(
      unverified.query(
        "insert into businesses(owner_id,name,slug,email) values($1,'Unverified','unverified-studio','unverified@example.test')",
        [uid],
      ),
      /row-level security/,
    );
  });
  await test('invitation connects an existing staff schedule', async () => {
    const uid = randomUUID();
    await db.query('insert into auth.users(id,email) values($1,$2)', [uid, 'linked@example.test']);
    const st2 = (
      await db.query(
        "insert into staff_profiles(business_id,name) values($1,'Existing team member') returning id",
        [b1],
      )
    ).rows[0].id;
    await db.query("select create_invitation_server($1,'linked@example.test','staff',$2,$3,$4)", [
      b1,
      'link-hash',
      u1,
      st2,
    ]);
    await db.query("select accept_invitation_server('link-hash',$1,'linked@example.test')", [uid]);
    assert.equal(
      (await db.query('select user_id from staff_profiles where id=$1', [st2])).rows[0].user_id,
      uid,
    );
    await db.query("select manage_member_server($1,$2,$3,'staff',true)", [b1, uid, u1]);
    assert.equal(
      (await db.query('select active from staff_profiles where id=$1', [st2])).rows[0].active,
      false,
    );
    assert.equal(
      (
        await db.query('select * from business_members where business_id=$1 and user_id=$2', [
          b1,
          uid,
        ])
      ).rowCount,
      0,
    );
  });
  await test('customer erasure cannot cross tenant boundaries', async () => {
    await assert.rejects(user.query('select anonymize_customer($1,$2)', [b2, c2]), /FORBIDDEN/);
    assert.equal(
      (await db.query('select name from customers where id=$1', [c2])).rows[0].name,
      'Customer B',
    );
  });
  await test('customer erasure preserves booking history and removes private details', async () => {
    const cid = (
      await db.query(
        "select id from customers where business_id=$1 and email='guest@example.test'",
        [b1],
      )
    ).rows[0].id;
    const before = (
      await db.query('select count(*)::int n from bookings where customer_id=$1', [cid])
    ).rows[0].n;
    await user.query('select anonymize_customer($1,$2)', [b1, cid]);
    assert.equal(
      (await db.query('select name from customers where id=$1', [cid])).rows[0].name,
      'Deleted customer',
    );
    assert.equal(
      (await db.query('select count(*)::int n from bookings where customer_id=$1', [cid])).rows[0]
        .n,
      before,
    );
    assert.equal(
      (
        await db.query(
          "select * from bookings where customer_id=$1 and customer_name<>'Deleted customer'",
          [cid],
        )
      ).rowCount,
      0,
    );
  });
  await test('notification preferences queue both reminders and can suppress email', async () => {
    await db.query('update businesses set reminder_hours=array[2,24] where id=$1', [b1]);
    const future = (
      await db.query("select ((current_date+5)+time '11:00') at time zone 'Europe/Berlin' t")
    ).rows[0].t.toISOString();
    const r = await reserve(db, randomUUID(), 'preference-hash', future);
    const id = r.rows[0].r.id;
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from notification_jobs where booking_id=$1 and kind='reminder'",
          [id],
        )
      ).rows[0].n,
      2,
    );
    await db.query('update businesses set notifications_enabled=false where id=$1', [b1]);
    const r2 = await reserve(
      db,
      randomUUID(),
      'disabled-notification-hash',
      new Date(Date.parse(future) + 3600000).toISOString(),
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from notification_jobs where booking_id=$1 and status<>'suppressed'",
          [r2.rows[0].r.id],
        )
      ).rows[0].n,
      0,
    );
  });
  await test('permanent service deletion is tenant scoped and preserves linked appointments', async () => {
    const own = (
      await db.query(
        "insert into services(business_id,name,duration_minutes) values($1,'Delete me',30) returning id",
        [b1],
      )
    ).rows[0].id;
    const other = (
      await db.query(
        "insert into services(business_id,name,duration_minutes) values($1,'Other tenant',30) returning id",
        [b2],
      )
    ).rows[0].id;
    assert.equal((await user.query('delete from services where id=$1', [other])).rowCount, 0);
    assert.equal((await user.query('delete from services where id=$1', [own])).rowCount, 1);
    await assert.rejects(user.query('delete from services where id=$1', [s]), /foreign key/i);
  });
  await test('deleting a staff profile revokes membership and removes linked invitations', async () => {
    const uid = randomUUID();
    await db.query("insert into auth.users(id,email) values($1,'remove-staff@example.test')", [
      uid,
    ]);
    await db.query("insert into business_members(business_id,user_id,role) values($1,$2,'staff')", [
      b1,
      uid,
    ]);
    const sid = (
      await db.query(
        "insert into staff_profiles(business_id,name,user_id) values($1,'Delete profile',$2) returning id",
        [b1, uid],
      )
    ).rows[0].id;
    await db.query(
      "insert into business_invitations(business_id,email,role,staff_id) values($1,'new@example.test','staff',$2)",
      [b1, sid],
    );
    assert.equal((await user.query('delete from staff_profiles where id=$1', [sid])).rowCount, 1);
    assert.equal(
      (await db.query('select * from business_members where user_id=$1', [uid])).rowCount,
      0,
    );
    assert.equal(
      (await db.query('select * from business_invitations where staff_id=$1', [sid])).rowCount,
      0,
    );
  });
  await test('active bookings cannot be deleted and cancelled bookings can', async () => {
    const target = (
      await db.query(
        "select id from bookings where business_id=$1 and status='confirmed' limit 1",
        [b1],
      )
    ).rows[0].id;
    assert.equal((await user.query('delete from bookings where id=$1', [target])).rowCount, 0);
    await user.query("update bookings set status='cancelled' where id=$1", [target]);
    assert.equal((await user.query('delete from bookings where id=$1', [target])).rowCount, 1);
    assert.equal(
      (await db.query('select * from notification_jobs where booking_id=$1', [target])).rowCount,
      0,
    );
  });
  await test('tenant deletion requires platform admin and exact name; keeps audit', async () => {
    await assert.rejects(
      db.query('select delete_business_server($1,$2,$3)', [b2, u2, 'Business B']),
      /FORBIDDEN/,
    );
    await assert.rejects(
      db.query('select delete_business_server($1,$2,$3)', [b2, u1, 'Wrong name']),
      /INVALID_INPUT/,
    );
    await db.query('select delete_business_server($1,$2,$3)', [b2, u1, 'Business B']);
    assert.equal((await db.query('select * from businesses where id=$1', [b2])).rowCount, 0);
    assert.equal(
      (
        await db.query(
          "select * from admin_audit_logs where action='business.deleted' and details->>'business_id'=$1",
          [b2],
        )
      ).rowCount,
      1,
    );
    assert.equal((await db.query('select * from businesses where id=$1', [b1])).rowCount, 1);
  });
  await test('suspended tenant loses private data access', async () => {
    await db.query("select admin_update_business($1,'suspended','free',$2)", [b1, u1]);
    assert.equal(
      (await user.query('select * from customers where business_id=$1', [b1])).rowCount,
      0,
    );
  });
  console.log(`\n${passed} PostgreSQL checks passed.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await Promise.all(clients.map((c) => c.end()));
  await server.stop();
}
