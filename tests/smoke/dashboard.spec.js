// R35 — Production smoke test. Runs against the live URL after every push.
// Verifies: page loads, no JS errors, no "cached demo" banner, login works,
// dashboard KPI cards render. If any fails, GitHub Actions marks the deploy red.

import { test, expect } from '@playwright/test';

const SITE_URL      = process.env.SITE_URL      || 'https://zamildashboard.com';
const TEST_EMAIL    = process.env.SMOKE_EMAIL   || 'qa.admin@coolcare.com.sa';
const TEST_PASSWORD = process.env.SMOKE_PASSWORD || 'Senaat2026!';

test.describe('Production smoke', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
    });
  });

  test('homepage loads with login form', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    // Use a unique selector for the heading (not the button which also says "Sign in").
    await expect(page.locator('h1', { hasText: 'Sign in' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="email"], input[placeholder*="@"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    const realErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') && !e.toLowerCase().includes('sentry')
    );
    expect(realErrors).toHaveLength(0);
  });

  test('login succeeds and dashboard renders without fallback banner', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });

    await page.locator('input[type="email"], input[placeholder*="@"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]', { hasText: 'Sign in' }).click();

    // After login, hash router goes to /home (Admin/VP/Manager/PgM) or /my-projects (PM)
    await page.waitForURL(/#\/(home|my-projects)/i, { timeout: 30000 });
    await page.waitForTimeout(7000); // boot orchestrator + bgFetch all tables

    // Critical: the red fallback banner must NOT appear
    const fallbackBanner = page.locator('text=/Couldn\'t load live data/i');
    await expect(fallbackBanner).not.toBeVisible();

    // Sidebar should be visible (proves the app booted past login)
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });

    // No JS errors during boot (filter known noise)
    const realErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.toLowerCase().includes('sentry') &&
      !e.toLowerCase().includes('warning') &&
      !e.includes('404')   // some optional fetches 404 in dev, OK
    );
    if (realErrors.length > 0) {
      console.log('Console errors detected:', realErrors);
    }
    expect(realErrors).toHaveLength(0);
  });

  test('audit log captures the smoke test login', async ({ request }) => {
    const supaUrl = process.env.SUPABASE_URL || 'https://bhesznqfrcyikfupdgkx.supabase.co';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      test.skip(true, 'SUPABASE_ANON_KEY not set in repo secrets — skipping audit verification');
      return;
    }
    const authRes = await request.post(`${supaUrl}/auth/v1/token?grant_type=password`, {
      headers: { 'apikey': anonKey, 'Content-Type': 'application/json' },
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(authRes.ok()).toBeTruthy();
    const { access_token } = await authRes.json();

    const auditRes = await request.get(
      `${supaUrl}/rest/v1/audit_log?entity_type=eq.session&action=eq.LOGIN&order=created_at.desc&limit=1`,
      { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${access_token}` } }
    );
    expect(auditRes.ok()).toBeTruthy();
    const rows = await auditRes.json();
    expect(rows.length).toBeGreaterThan(0);
    const last = rows[0];
    expect(last.payload?.ip).toBeTruthy();
    console.log('Last LOGIN captured:', last.summary, '· IP:', last.payload.ip);
  });
});
