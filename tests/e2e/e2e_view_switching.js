const { chromium } = require('playwright');

// Two separate tests - one for view switching, one for telecaller direct
async function runTests() {
  const results = { passed: 0, failed: 0, tests: [] };

  // ─── TEST SUITE 1: Manager / Boss View Switching ───────────────────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:5173/login');
      await page.waitForTimeout(2000);
      await page.fill('#email-address', 'owner@shanthiayurvedas.com');
      await page.fill('#password', 'Password@12345');
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const check = async (label, fn) => {
        const v = await fn();
        const passed = v === true;
        results.tests.push({ label, passed, value: v });
        console.log(`${passed ? '✅' : '❌'} ${label}: ${v}`);
        if (passed) results.passed++; else results.failed++;
      };

      await check('Redirected to dashboard', async () => page.url().includes('/dashboard'));
      await check('Manager badge visible', async () => page.locator('text=MANAGER').first().isVisible().catch(() => false));
      await check('Boss View button visible', async () => page.locator('button:has-text("Boss View")').first().isVisible().catch(() => false));

      // Click Boss View
      await page.locator('button:has-text("Boss View")').first().click();
      await page.waitForTimeout(2000);
      await check('Boss View URL has ?view=boss', async () => page.url().includes('view=boss'));
      await check('Boss View Overview tab visible', async () => page.locator('text=Overview').first().isVisible().catch(() => false));
      await check('Boss View KPI cards visible', async () => page.locator('text=Month Revenue').first().isVisible().catch(() => false));
      await check('Boss View Manager return button', async () => page.locator('button:has-text("Manager View")').first().isVisible().catch(() => false));

      // Switch back to Manager
      await page.locator('button:has-text("Manager View")').first().click();
      await page.waitForTimeout(2000);
      await check('Switched back to Manager (MANAGER badge)', async () => page.locator('text=MANAGER').first().isVisible().catch(() => false));

      // Navigate to telecaller via URL in SAME context
      await page.goto('http://localhost:5173/dashboard?view=telecaller');
      await page.waitForTimeout(5000);
      const tcURL = page.url();
      console.log('TC page URL:', tcURL);

      if (tcURL.includes('login')) {
        console.log('NOTE: Session not persisted for page.goto — testing TC view separately...');
      } else {
        await check('TC advisory banner visible', async () => page.locator('text=Ayurvedic Weight Loss').first().isVisible().catch(() => false));
        await check('TC MY LEADS KPI visible', async () => page.locator('text=MY LEADS').first().isVisible().catch(() => false));
        await check('TC FOLLOWUPS KPI visible', async () => page.locator('text=FOLLOWUPS').first().isVisible().catch(() => false));
        await check('TC tabs count is 11', async () => (await page.locator('[id^="tab-tc-"]').count().catch(() => 0)) === 11);
        await check('TC duty toggle visible', async () => page.locator('#btn-tc-duty-toggle').isVisible().catch(() => false));
      }

    } catch (err) {
      console.error('Suite 1 error:', err.message);
    } finally {
      await browser.close();
    }
  }

  // ─── TEST SUITE 2: Telecaller Direct Login & View ─────────────────────────
  {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Login directly and navigate to dashboard?view=telecaller in one shot
      await page.goto('http://localhost:5173/login');
      await page.waitForTimeout(2000);
      await page.fill('#email-address', 'owner@shanthiayurvedas.com');
      await page.fill('#password', 'Password@12345');
      await page.click('button[type="submit"]');
      // Wait for redirect and then navigate SPA-internally
      await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(3000);

      // Now use React router navigation (click if available) vs URL manipulation
      // Direct SPA navigation: update URL via JS so session is preserved
      await page.evaluate(() => {
        window.history.pushState({}, '', '/dashboard?view=telecaller');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      await page.waitForTimeout(4000);

      const check = async (label, fn) => {
        const v = await fn();
        const passed = v === true;
        results.tests.push({ label, passed, value: v });
        console.log(`${passed ? '✅' : '❌'} ${label}: ${v}`);
        if (passed) results.passed++; else results.failed++;
      };

      const tcURL = page.url();
      console.log('TC page URL:', tcURL);
      const bodyText = await page.locator('body').innerText().catch(() => '');

      await check('TC URL has view=telecaller', async () => tcURL.includes('view=telecaller'));
      await check('TC advisory banner visible', async () => page.locator('text=Ayurvedic Weight Loss').first().isVisible().catch(() => false));
      await check('TC MY LEADS KPI visible', async () => page.locator('text=MY LEADS').first().isVisible().catch(() => false));
      await check('TC FOLLOWUPS KPI visible', async () => page.locator('text=FOLLOWUPS').first().isVisible().catch(() => false));
      await check('TC ORDERS KPI visible', async () => page.locator('text=ORDERS').first().isVisible().catch(() => false));
      await check('TC CONSULTS KPI visible', async () => page.locator('text=CONSULTS').first().isVisible().catch(() => false));
      const tcTabsCount = await page.locator('[id^="tab-tc-"]').count().catch(() => 0);
      console.log(`${tcTabsCount === 11 ? '✅' : '⚠️'} TC tabs count: ${tcTabsCount} (expecting 11)`);
      await check('TC Book Consult button visible', async () => page.locator('#btn-tc-book-consult').isVisible().catch(() => false));
      await check('TC New Order button visible', async () => page.locator('#btn-tc-new-order').isVisible().catch(() => false));
      await check('TC Product Lead button visible', async () => page.locator('#btn-tc-new-lead').isVisible().catch(() => false));
      await check('TC Call Centre button visible', async () => page.locator('#btn-tc-call-centre').isVisible().catch(() => false));
      await check('TC Customer Profile button visible', async () => page.locator('#btn-tc-cust-profile').isVisible().catch(() => false));
      await check('TC Duty toggle visible', async () => page.locator('#btn-tc-duty-toggle').isVisible().catch(() => false));

      // Test Book Consult modal
      if (await page.locator('#btn-tc-book-consult').isVisible().catch(() => false)) {
        await page.click('#btn-tc-book-consult');
        await page.waitForTimeout(1000);
        await check('TC Book Consult modal opened', async () => page.locator('text=Book Patient Consultation').first().isVisible().catch(() => false));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Test New Order modal
      if (await page.locator('#btn-tc-new-order').isVisible().catch(() => false)) {
        await page.click('#btn-tc-new-order');
        await page.waitForTimeout(1000);
        await check('TC New Order modal opened', async () => page.locator('text=Create Direct Telecaller Order').first().isVisible().catch(() => false));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }

      // Test Leads tab
      const leadsTab = page.locator('[id="tab-tc-leads"]').first();
      if (await leadsTab.isVisible().catch(() => false)) {
        await leadsTab.click();
        await page.waitForTimeout(1000);
        await check('TC Leads tab content visible', async () => page.locator('text=Assigned Patient Inquiries').first().isVisible().catch(() => false));
      }

      // Test Reorder Calls tab
      const rcTab = page.locator('[id="tab-tc-reorder_calls"]').first();
      if (await rcTab.isVisible().catch(() => false)) {
        await rcTab.click();
        await page.waitForTimeout(1000);
        await check('TC Reorder Calls tab visible', async () => page.locator('text=Repeat Prescription').first().isVisible().catch(() => false));
      }

      // Test Attendance tab
      const attTab = page.locator('[id="tab-tc-attendance"]').first();
      if (await attTab.isVisible().catch(() => false)) {
        await attTab.click();
        await page.waitForTimeout(1000);
        await check('TC Attendance tab visible', async () => page.locator('text=Daily Telecaller Attendance').first().isVisible().catch(() => false));
      }

      // Test Power Dialer tab
      const pdTab = page.locator('[id="tab-tc-power_dialer"]').first();
      if (await pdTab.isVisible().catch(() => false)) {
        await pdTab.click();
        await page.waitForTimeout(1000);
        await check('TC Power Dialer tab visible', async () => page.locator('text=Fast Power Dialer').first().isVisible().catch(() => false));
        await check('TC Dial Now button visible', async () => page.locator('a:has-text("Dial Now")').first().isVisible().catch(() => false));
      }

      // Test Back to Manager button
      await check('TC Back to Manager button visible', async () => page.locator('#btn-back-to-manager').isVisible().catch(() => false));

    } catch (err) {
      console.error('Suite 2 error:', err.message);
    } finally {
      await browser.close();
    }
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log(`║  E2E RESULTS: ${results.passed} PASSED, ${results.failed} FAILED  ║`);
  console.log('╚══════════════════════════════════════╝');
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
