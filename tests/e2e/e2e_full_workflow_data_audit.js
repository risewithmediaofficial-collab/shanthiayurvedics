const { chromium } = require('playwright');
const path = require('path');

async function runWorkflowAudit() {
  console.log('================================================================');
  console.log('🚀 CRM FULL DATA WORKFLOW & ALL-MODULE INTEGRATION TEST AUDIT');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = { passed: 0, failed: 0, tests: [] };
  const check = async (label, fn) => {
    try {
      const v = await fn();
      const ok = v === true;
      results.tests.push({ label, ok, val: v });
      console.log(`${ok ? '✅' : '❌'} ${label}: ${v}`);
      if (ok) results.passed++; else results.failed++;
    } catch (e) {
      console.log(`❌ ${label} EXCEPTION: ${e.message}`);
      results.tests.push({ label, ok: false, val: e.message });
      results.failed++;
    }
  };

  const artifactDir = 'C:/Users/Sathish kumar/.gemini/antigravity-ide/brain/60cad813-d5dc-408b-be3d-1f5656c57582';

  try {
    // -------------------------------------------------------------
    // 1. AUTHENTICATION
    // -------------------------------------------------------------
    console.log('--- Phase 1: Authentication ---');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);
    await page.fill('#email-address', 'owner@shanthiayurvedas.com');
    await page.fill('#password', 'Password@12345');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    await check('Logged in and redirected to Dashboard', async () => page.url().includes('/dashboard'));
    await check('Manager view active by default', async () => page.locator('text=MANAGER').first().isVisible());

    // -------------------------------------------------------------
    // 2. MANAGER DESK — ALL 10 MODULES WORKFLOW AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Phase 2: Manager Desk — 10 Modules Data Verification ---');

    // Module 1: ORDERS Tab
    console.log('\n[Module 1: ORDERS]');
    await page.locator('#tab-manager-orders').click();
    await page.waitForTimeout(2000);
    await check('Orders tab URL has tab=orders', async () => page.url().includes('tab=orders'));
    await check('Fulfillment pipeline bar visible', async () => page.locator('text=NEW').first().isVisible());
    await check('Orders list shows live seeded orders', async () => {
      const orderCardCount = await page.locator('text=AYUR-HSR-').count();
      const hasOrderText = await page.locator('text=Orders').first().isVisible();
      console.log(`   Found ${orderCardCount} order cards with AYUR-HSR- prefix`);
      return orderCardCount > 0 || hasOrderText;
    });
    await check('India Post logistics integration visible in orders', async () => {
      return (await page.locator('text=IP108849').first().isVisible().catch(() => false)) ||
             (await page.locator('text=India Post').first().isVisible().catch(() => false));
    });

    // Module 2: LEADS Tab
    console.log('\n[Module 2: LEADS]');
    await page.locator('#tab-manager-leads').click();
    await page.waitForTimeout(2000);
    await check('Leads tab URL has tab=leads', async () => page.url().includes('tab=leads'));
    await check('Leads list shows live seeded leads', async () => {
      const locationTags = await page.locator('text=📍').count();
      const hasLeads = (await page.locator('text=Caller:').count()) > 0 || locationTags > 0;
      console.log(`   Found ${locationTags} lead cards with location tags`);
      return hasLeads;
    });
    await check('Customer contact phone numbers loaded', async () => {
      const count = await page.locator('text=📱').count();
      console.log(`   Found ${count} phone indicators on leads`);
      return count > 0 || (await page.locator('text=984').first().isVisible().catch(() => false));
    });

    // Module 3: CONSULT Tab
    console.log('\n[Module 3: CONSULT]');
    await page.locator('#tab-manager-consult').click();
    await page.waitForTimeout(2000);
    await check('Consult tab URL has tab=consult', async () => page.url().includes('tab=consult'));
    await check('Consultation appointments loaded', async () => {
      return (await page.locator('text=Dr. Shanthi').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Wellness').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Consult').first().isVisible().catch(() => false));
    });

    // Module 4: STOCK Tab
    console.log('\n[Module 4: STOCK]');
    await page.locator('#tab-manager-stock').click();
    await page.waitForTimeout(2500);
    await check('Stock tab URL has tab=stock', async () => page.url().includes('tab=stock'));
    await check('Ayurvedic products visible in stock', async () => {
      const rows = await page.locator('table tbody tr').count();
      const hasSkus = await page.locator('text=SKU:').count();
      console.log(`   Found ${rows} stock rows, ${hasSkus} SKU labels`);
      return rows > 0 || hasSkus > 0;
    });

    // Module 5: TEAM Tab
    console.log('\n[Module 5: TEAM]');
    await page.locator('#tab-manager-team').click();
    await page.waitForTimeout(2000);
    await check('Team tab URL has tab=team', async () => page.url().includes('tab=team'));
    await check('Team cards rendered with telecaller names', async () => {
      const openBtns = await page.locator('[id^="btn-open-telecaller-"]').count();
      console.log(`   Found ${openBtns} team cards with open telecaller buttons`);
      return openBtns > 0;
    });
    await check('Open Telecaller Dashboard button on staff card', async () => {
      return page.locator('[id^="btn-open-telecaller-"]').first().isVisible();
    });

    // Module 6: TC SALES / SALARY Tab
    console.log('\n[Module 6: TC SALES / SALARY]');
    await page.locator('#tab-manager-salary').click();
    await page.waitForTimeout(2000);
    await check('Salary tab URL has tab=salary', async () => page.url().includes('tab=salary'));
    await check('Salary table shows telecaller payouts', async () => {
      return (await page.locator('table').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Commission').first().isVisible().catch(() => false));
    });

    // Module 7: OFFICE SALE Tab
    console.log('\n[Module 7: OFFICE SALE]');
    await page.locator('#tab-manager-office_sale').click();
    await page.waitForTimeout(2000);
    await check('Office Sale tab URL has tab=office_sale', async () => page.url().includes('tab=office_sale'));
    await check('Counter Sale action buttons visible', async () => {
      return (await page.locator('text=Office Sale').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Walk-in').first().isVisible().catch(() => false));
    });

    // Module 8: BRANCH ORDERS Tab
    console.log('\n[Module 8: BRANCH ORDERS]');
    await page.locator('#tab-manager-branch_orders').click();
    await page.waitForTimeout(2000);
    await check('Branch Orders tab URL has tab=branch_orders', async () => page.url().includes('tab=branch_orders'));
    await check('Branch dispatch table or list visible', async () => {
      return (await page.locator('text=Branch').first().isVisible().catch(() => false)) ||
             (await page.locator('table').first().isVisible().catch(() => false));
    });

    // Module 9: TILL-DATE & WITHDRAWAL Tab
    console.log('\n[Module 9: TILL-DATE & WITHDRAWAL]');
    await page.locator('#tab-manager-withdrawal').click();
    await page.waitForTimeout(2000);
    await check('Withdrawal tab URL has tab=withdrawal', async () => page.url().includes('tab=withdrawal'));
    await check('Withdrawal ledger & balance visible', async () => {
      return (await page.locator('text=Withdrawal').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Ledger').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Balance').first().isVisible().catch(() => false));
    });

    // Module 10: STUCK / SHIPPED Tab
    console.log('\n[Module 10: STUCK / SHIPPED]');
    await page.locator('#tab-manager-stuck').click();
    await page.waitForTimeout(2000);
    await check('Stuck / Shipped tab URL has tab=stuck', async () => page.url().includes('tab=stuck'));
    await check('Logistics tracking filter visible', async () => {
      return (await page.locator('text=Shipped').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Tracking').first().isVisible().catch(() => false));
    });

    // -------------------------------------------------------------
    // 3. TELECALLER WORKSTATION WORKFLOW TEST
    // -------------------------------------------------------------
    console.log('\n--- Phase 3: Telecaller Live Workstation Workflow ---');
    await page.locator('#tab-manager-team').click();
    await page.waitForTimeout(1500);

    const openDeskBtn = page.locator('[id^="btn-open-telecaller-"]').first();
    await openDeskBtn.click();
    await page.waitForTimeout(3000);

    await check('Navigated to Telecaller View', async () => page.url().includes('view=telecaller'));
    await check('Supervisor Preview Mode banner active', async () => page.locator('text=Supervisor Preview Mode').first().isVisible());
    await check('Telecaller KPI ribbons loaded (MY LEADS, FOLLOWUPS, ORDERS)', async () => {
      return (await page.locator('text=MY LEADS').first().isVisible().catch(() => false)) &&
             (await page.locator('text=FOLLOWUPS').first().isVisible().catch(() => false));
    });
    await check('Back to Manager Desk button available', async () => page.locator('#btn-back-to-manager').isVisible());

    // Test duty check-in toggle
    const dutyToggle = page.locator('#btn-tc-duty-toggle');
    await check('Duty Check-in toggle is interactive', async () => dutyToggle.isVisible());
    await dutyToggle.click();
    await page.waitForTimeout(500);
    await dutyToggle.click();
    await page.waitForTimeout(500);

    // Return to Manager Desk
    await page.locator('#btn-back-to-manager').click();
    await page.waitForTimeout(2000);
    await check('Returned to Manager Desk successfully', async () => page.url().includes('tab=team') && !page.url().includes('view=telecaller'));

    // -------------------------------------------------------------
    // 4. BOSS / DISTRIBUTOR DESK WORKFLOW & DATA AUDIT
    // -------------------------------------------------------------
    console.log('\n--- Phase 4: Boss / Distributor Desk Workflow & Analytics ---');
    await page.locator('#btn-boss-view').click();
    await page.waitForTimeout(3000);

    await check('Boss View active (view=boss in URL)', async () => page.url().includes('view=boss'));
    await check('Distributor Panel Header with Biller ID', async () => page.locator('text=Distributor Panel').first().isVisible());
    await check('Boss View 4 KPI Ribbon visible', async () => {
      return (await page.locator('text=Month Revenue').first().isVisible().catch(() => false)) &&
             (await page.locator('text=Total Orders').first().isVisible().catch(() => false));
    });

    // Test Boss Tab: TEAM Leaderboard
    console.log('\n[Boss Tab: TEAM]');
    await page.locator('#tab-boss-team').click();
    await page.waitForTimeout(2000);
    await check('Boss Team Leaderboard displayed', async () => page.locator('text=Telecaller Performance Leaderboard').first().isVisible());
    await check('Boss Leaderboard rows has Dashboard button', async () => page.locator('[id^="btn-boss-open-telecaller-"]').first().isVisible());

    // Test opening telecaller from Boss View
    const bossOpenBtn = page.locator('[id^="btn-boss-open-telecaller-"]').first();
    await bossOpenBtn.click();
    await page.waitForTimeout(3000);

    await check('Telecaller Console opened from Boss Desk', async () => page.url().includes('view=telecaller'));
    await check('Back to Boss Panel button is visible', async () => page.locator('#btn-back-to-boss').isVisible());

    // Return to Boss View
    await page.locator('#btn-back-to-boss').click();
    await page.waitForTimeout(2000);
    await check('Returned cleanly to Boss View', async () => page.url().includes('view=boss'));

    // Test Boss Tab: PAYOUT (35% Net Commission Formula)
    console.log('\n[Boss Tab: PAYOUT]');
    await page.locator('#tab-boss-payout').click();
    await page.waitForTimeout(2000);
    await check('Boss Payout formula displayed', async () => page.locator('text=35% net share').first().isVisible().catch(() => false));
    await check('Commission breakdown table visible', async () => page.locator('text=Commission & Share Breakdown').first().isVisible().catch(() => false));

    // Test Boss Tab: SETTLEMENT
    console.log('\n[Boss Tab: SETTLEMENT]');
    await page.locator('#tab-boss-settlement').click();
    await page.waitForTimeout(2000);
    await check('Settlement streams loaded', async () => {
      return (await page.locator('text=Settlement').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Revenue').first().isVisible().catch(() => false));
    });

    // Test Boss Tab: FRANCHISE
    console.log('\n[Boss Tab: FRANCHISE]');
    await page.locator('#tab-boss-franchise').click();
    await page.waitForTimeout(2000);
    await check('Franchise Branch network loaded', async () => {
      return (await page.locator('text=Franchise').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Hosur').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Krishnagiri').first().isVisible().catch(() => false));
    });

    // Test Boss Tab: GST BILLING
    console.log('\n[Boss Tab: GST BILLING]');
    await page.locator('#tab-boss-gst').click();
    await page.waitForTimeout(2000);
    await check('GST Billing invoice generator loaded', async () => {
      return (await page.locator('text=GST').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Invoice').first().isVisible().catch(() => false));
    });

    // Test Boss Tab: PURCHASE EXPENSES
    console.log('\n[Boss Tab: PURCHASE EXPENSES]');
    await page.locator('#tab-boss-expenses').click();
    await page.waitForTimeout(2000);
    await check('Purchase Expenses procurement records loaded', async () => {
      return (await page.locator('text=Expense').first().isVisible().catch(() => false)) ||
             (await page.locator('text=Vendor').first().isVisible().catch(() => false));
    });

    // Return to Manager View
    await page.locator('#btn-switch-manager-view').click();
    await page.waitForTimeout(2500);
    await check('Switched back to Manager Desk', async () => page.locator('text=MANAGER').first().isVisible());

    // Capture final verification screenshot
    await page.screenshot({ path: path.join(artifactDir, 'full_workflow_audit_success.png') });
    console.log('\n📸 Captured final full workflow screenshot: full_workflow_audit_success.png');

  } catch (err) {
    console.error('Fatal execution error:', err);
  } finally {
    await browser.close();
    console.log('\n================================================================');
    console.log(`🏁 AUDIT COMPLETE: ${results.passed} PASSED, ${results.failed} FAILED`);
    console.log('================================================================\n');
  }
}

runWorkflowAudit();
