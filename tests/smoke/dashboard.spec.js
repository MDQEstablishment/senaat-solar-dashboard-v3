// R35 — Production smoke test. Runs against the live URL after every push.
// Verifies: page loads, no JS errors, no "cached demo" banner, login works,
// dashboard KPI cards render. If any fails, GitHub Actions marks the deploy red.

import { test, expect } from '@playwright/test';

const SITE_URL = process.env.SITE_URL || 'https://zamildashboard.com';
const TEST_EMAIL = process.env.SMOKE_EMAIL || 'qa.admin@coolcare.com.sa';
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
    await expect(page.locator('text=Sign in')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"], input[placeholder*="@"]')).toBeVisible();
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  test('login succeeds and dashboard renders without fallback banner', async ({ page }) => {
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    await page.locator('input[type="email"], input[placeholder*="@"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button:has-text("Sign in")').click();

    // Wait for dashboard
    await page.waitForURL(/#\/home|#\/my-projects/, { timeout: 15000 });
    await page.waitForTimeout(5000); // give boot orchestrator time

    // Critical: the red fallback banner must NOT appear
    const fallbackBanner = page.locator('text=/Couldn\'t load live data/i');
    await expect(fallbackBanner).not.toBeVisible();

    // KPI cards should render with real data
    await expect(page.locator('text=TOTAL PROJECTS').first()).toBeVisible({ timeout: 10000 });

    // No JS errors during boot
    const realErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.toLowerCase().includes('warning')
    );
    if (realErrors.length > 0) {
      console.log('Console errors detected:', realErrors);
    }
    expect(realErrors).toHaveLength(0);
  });

  test('audit log captures the smoke test login', async ({ page, request }) => {
    // Just verify the login from the previous test made it into audit log
    // We use the Supabase REST API directly with the anon key
    // (audit_log SELECT requires auth, so we sign in via API first)
    const supaUrl = process.env.SUPABASE_URL || 'https://bhesznqfrcyikfupdgkx.supabase.co';
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      test.skip('SUPABASE_ANON_KEY not provided — skipping audit verification');
      return;
    }
    // sign in
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
    expect(last.payload.ip).toBeTruthy();
    console.log('Last LOGIN captured:', last.summary, 'IP:', last.payload.ip);
  });
});
