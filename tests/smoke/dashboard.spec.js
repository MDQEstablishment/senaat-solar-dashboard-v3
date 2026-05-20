// R35 — Production smoke test. Runs against the live URL after every push.

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

    // R35.2 — Don't wait for URL change (hash router doesn't trigger Playwright's
    // navigation events). Wait for the sidebar to appear instead, which only
    // renders after auth resolves.
    await expect(page.locator('a, button', { hasText: 'Dashboard' }).first()).toBeVisible({ timeout: 30000 });

    // Boot orchestrator pulls 12 tables; give it 7s
    await page.waitForTimeout(7000);

    // CRITICAL: fallback banner must NOT appear (this caught the rawChatMessages bug)
    const fallbackBanner = page.locator('text=/Couldn\'t load live data/i');
    await expect(fallbackBanner).not.toBeVisible();

    // Some real dashboard content should be visible (KPI label or sidebar item)
    const haveContent = page.locator('text=/TOTAL PROJECTS|TOTAL SCHOOLS|Portfolio at a glance|My Programs/i').first();
    await expect(haveContent).toBeVisible({ timeout: 10000 });

    // No JS errors during boot (filter known noise)
    const realErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('manifest') &&
      !e.toLowerCase().includes('sentry') && !e.toLowerCase().includes('warning') &&
      !e.includes('404')
    );
    if (realErrors.length > 0) console.log('Console errors detected:', realErrors);
    expect(realErrors).toHaveLength(0);
  });

  test('audit log captures the smoke test login', async ({ request }) => {
    const supaUrl = process.env.SUPABASE_URL || 'https://bhesznqfrcyikfupdgkx.supabase.co';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      test.skip(true, 'SUPABASE_ANON_KEY not set — skipping audit verification');
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
    expect(rows[0].payload?.ip).toBeTruthy();
    console.log('Last LOGIN captured:', rows[0].summary, '· IP:', rows[0].payload.ip);
  });
});
