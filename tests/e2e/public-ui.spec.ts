import { test, expect } from '@playwright/test';

test.use({
  launchOptions: process.env.E2E_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.E2E_CHROMIUM_EXECUTABLE, args: ['--no-sandbox'] }
    : {},
});

test('public pages fit the viewport and admin has a separate sign in', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of [
    '/',
    '/de',
    '/login',
    '/signup',
    '/forgot-password',
    '/admin/login',
    '/invite',
    '/manage',
    '/about',
    '/contact',
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
  }
  await page.goto('/admin/login');
  await expect(page.locator('.auth-form h1')).toContainText(
    /Plattform-Admin|Platform administrator/,
  );
  await expect(page.locator('input[name="name"]')).toHaveCount(0);
  await page.locator('.password-toggle').click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'text');
  await page.locator('.password-toggle').click();
  await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  if ((page.viewportSize()?.width || 1440) < 800) {
    await page.goto('/');
    await page.locator('.mobile-site-menu summary').click();
    await expect(page.locator('.mobile-site-menu a').first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});
