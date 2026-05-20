// R35.4 — Production smoke test (minimal, reliable).
//
// After multiple iterations on the headless auth flow + REST API tests we
// kept hitting flakiness specific to GitHub Actions runner IPs. The single
// most valuable check is: "does the page load without React boot errors?"
// — that's what catches the kind of bug the rawChatMessages regression was.
//
// This minimal version is intentionally narrow: page loads, no console errors,
// login form is visible. If anyone needs deeper E2E later, they can run
// Playwright locally with full credentials.

import { test, expect } from '@playwright/test';

const SITE_URL = process.env.SITE_URL || 'https://zamildashboard.com';

test('homepage loads with no JS errors and login form visible', async ({ page }) => {
  const consoleErrors = [];
  page.on('pageerror', err => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`console.error: ${msg.text()}`);
  });

  await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Heading + form fields visible
  await expect(page.locator('h1', { hasText: 'Sign in' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('input[type="email"], input[placeholder*="@"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();

  // The critical signal — did the React app boot without exceptions?
  // This catches the rawChatMessages-class of bug.
  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('manifest') &&
    !e.toLowerCase().includes('sentry') &&
    !e.includes('404')
  );
  if (realErrors.length > 0) console.log('Real errors:', realErrors);
  expect(realErrors).toHaveLength(0);
});
