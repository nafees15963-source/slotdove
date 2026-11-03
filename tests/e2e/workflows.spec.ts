import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const enabled =
  process.env.E2E_ALLOW_TEST_DATA === 'true' &&
  !!process.env.E2E_SUPABASE_URL &&
  !!process.env.E2E_SUPABASE_SECRET_KEY;
const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const email = `slotdove-e2e-${suffix}@example.invalid`,
  password = `Test-only-${suffix}!`;
const slug = `e2e-${suffix}`;
let admin: SupabaseClient, userId: string, businessId: string;
test.describe('real staging workflows', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !enabled,
    'Requires an explicitly selected staging project, secret key and E2E_ALLOW_TEST_DATA=true.',
  );
  test.beforeAll(async () => {
    admin = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  });
  test.afterAll(async () => {
    if (businessId) await admin.from('businesses').delete().eq('id', businessId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });
  test('owner signs in and completes company onboarding', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/onboarding/);
    await page.getByLabel('Business name', { exact: true }).fill('E2E Studio');
    await page.getByLabel('Booking page URL').fill(slug);
    await page.getByLabel('Timezone', { exact: true }).selectOption('Europe/Berlin');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page).toHaveURL(/dashboard\/services/);
    const { data, error } = await admin.from('businesses').select('id').eq('slug', slug).single();
    if (error) throw error;
    businessId = data.id;
    await admin
      .from('businesses')
      .update({
        is_demo: true,
        demo_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .eq('id', businessId);
  });
  test('create service, team schedule and publish booking page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto('/dashboard/staff');
    await page.getByRole('button', { name: 'Add team member', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name', { exact: true }).fill('E2E Team');
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto('/dashboard/services');
    await page.getByRole('button', { name: 'Add service', exact: true }).click();
    await dialog.getByLabel('Name', { exact: true }).fill('E2E Consultation');
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Assign services' }).click();
    await dialog.getByText('E2E Team').click();
    await expect(dialog.getByRole('checkbox')).toBeChecked();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.goto('/dashboard/availability');
    await page.getByRole('button', { name: 'Add working hours', exact: true }).click();
    const tomorrow = new Date(Date.now() + 2 * 86400000);
    await dialog.getByLabel('Weekday').selectOption(String(tomorrow.getDay()));
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto('/dashboard/booking');
    await page.getByLabel('Publish booking page').check();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Published', { exact: true })).toBeVisible();
  });
  test('guest books, sees confirmation and cancels through private link', async ({ page }) => {
    await page.goto(`/b/${slug}`);
    await page.getByRole('button', { name: /E2E Consultation/ }).click();
    const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Choose a date').fill(date);
    await page.locator('.slot').first().click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill('E2E Guest');
    await page.getByLabel('Email address', { exact: true }).fill(`guest-${suffix}@example.invalid`);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Review & book', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm appointment', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'You’re booked.' })).toBeVisible();
    await page.getByRole('link', { name: 'Manage appointment', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'E2E Consultation' })).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancelled', exact: true }).click();
    await expect(page.getByText(/Cancelled/)).toBeVisible();
  });
});
test('marketing navigation and language preference', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your time.');
  await page.getByRole('button', { name: 'Switch to German' }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Deine Zeit.');
  await page
    .getByRole('link', { name: /Jetzt starten/ })
    .first()
    .click();
  await expect(page).toHaveURL(/signup/);
});
test('admin center rejects an unauthenticated visitor', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/login/);
});

test.describe('platform administration in explicitly authorized staging', () => {
  const adminEnabled =
    enabled && !!process.env.E2E_PLATFORM_ADMIN_EMAIL && !!process.env.E2E_PLATFORM_ADMIN_PASSWORD;
  const demoSlug = `admin-${suffix}`;
  test.skip(!adminEnabled, 'Requires an explicitly bootstrapped staging platform administrator.');
  test.afterAll(async () => {
    if (!adminEnabled) return;
    const client = createClient(
      process.env.E2E_SUPABASE_URL!,
      process.env.E2E_SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    await client.from('businesses').delete().eq('slug', demoSlug);
  });
  test('admin creates, resets and converts a demo workspace', async ({ page }) => {
    await page.goto('/login');
    await page
      .getByLabel('Email address', { exact: true })
      .fill(process.env.E2E_PLATFORM_ADMIN_EMAIL!);
    await page
      .getByLabel('Password', { exact: true })
      .fill(process.env.E2E_PLATFORM_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/dashboard|onboarding/);
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Create your workspace', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Business name', { exact: true }).fill('E2E Admin Demo');
    await dialog.getByLabel('Booking page URL').fill(demoSlug);
    await dialog.getByLabel('Email address', { exact: true }).fill('prospect@example.invalid');
    await dialog.getByLabel(/Demo workspace/).check();
    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const row = page.getByRole('row').filter({ hasText: demoSlug });
    await expect(row).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Reset sample data' }).click();
    await expect(row.getByRole('button', { name: 'Convert', exact: true })).toBeEnabled();
    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: 'Convert', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Convert', exact: true })).not.toBeVisible();
  });
});
