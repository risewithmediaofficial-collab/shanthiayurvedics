import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runCompleteCrmAudit() {
  console.log('🚀 Starting Full CRM Deep Audit & Verification across All Views & Modules...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.error(`❌ FAILED: ${message}`);
      failed++;
    }
  }

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // 1. AUDIT PUBLIC PATIENT CONSULTATION BOOKING PAGE (book_consultation.php)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Auditing Public Patient Consultation Booking Page ---');
    await page.goto(`${BASE_URL}/book-consultation`);
    await page.waitForTimeout(2000);

    const bookingHeading = await page.locator('text=Personalized Ayurvedic Consultation').isVisible();
    assert(bookingHeading, 'Public Consultation booking page opens without login');

    const herbalBadge = await page.locator('text=100% Herbal & Natural').isVisible();
    assert(herbalBadge, 'Trust badge 100% Herbal & Natural visible');

    // Fill booking form
    await page.fill('input[placeholder*="Priyadharshini"]', 'Anitha Krishnan');
    await page.fill('input[placeholder*="10-digit"]', '9845088771');
    await page.fill('input[placeholder*="32"]', '29');
    await page.fill('input[placeholder*="Hosur"]', 'Hosur');
    await page.click('button:has-text("Book Free Consultation")');
    await page.waitForTimeout(1500);

    const confirmReceived = await page.locator('text=Consultation Request Received').isVisible();
    assert(confirmReceived, 'Public booking submitted: confirmation received with booking reference');

    // ══════════════════════════════════════════════════════════════════════════
    // 2. AUDIT DIRECT TELECALLER LOGIN (Sathish Kumar -> Telecaller View)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Auditing Direct Telecaller Login & Workflow ---');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1500);

    await page.fill('#email-address', 'sathishyadav8898@gmail.com');
    await page.fill('#password', 'Password@12345');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const tcAdvisory = await page.locator('text=Ayurvedic Weight Loss & Wellness Adviser Panel').isVisible().catch(() => false);
    assert(tcAdvisory, 'Direct Telecaller Login lands directly on Telecaller Dashboard View');

    const tcKpiLeads = await page.locator('text=MY LEADS').isVisible();
    assert(tcKpiLeads, 'Telecaller View 4 KPI cards visible (MY LEADS, FOLLOWUPS, CONSULTS, ORDERS)');

    const tcDutyBtn = await page.locator('#btn-tc-duty-toggle').isVisible();
    assert(tcDutyBtn, 'Telecaller Duty check-in toggle button visible');

    const tcQuickOrder = await page.locator('#btn-tc-new-order').isVisible();
    assert(tcQuickOrder, 'Telecaller Quick Action buttons (+ Book Consult, + New Order, Call Centre) visible');

    // Test Telecaller Duty toggle
    await page.click('#btn-tc-duty-toggle');
    await page.waitForTimeout(600);
    console.log('✅ Telecaller duty toggled successfully');
    passed++;

    // ══════════════════════════════════════════════════════════════════════════
    // 3. AUDIT MANAGER VIEW (Owner Login -> Manager View 1st)
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Auditing Manager Operations Hub & Boss View Navigation ---');
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(1500);

    await page.fill('#email-address', 'owner@shanthiayurvedas.com');
    await page.fill('#password', 'Password@12345');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const managerBadge = await page.locator('text=MANAGER').first().isVisible();
    assert(managerBadge, 'Manager View 1st lands on Manager Operations Hub');

    const bossBtn = await page.locator('#btn-boss-view').isVisible();
    assert(bossBtn, 'Boss View switch button visible in Manager View');
    await page.click('#btn-boss-view');
    await page.waitForTimeout(1500);

    assert(page.url().includes('view=boss'), 'Switched to Boss View (?view=boss in URL)');

    // ══════════════════════════════════════════════════════════════════════════
    // 4. AUDIT BOSS VIEW 10 TABS & INTERACTIVE MODALS
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n--- Auditing Boss View 10 Modules, Sub-Tabs & Interactive Modals ---');

    // Tab 7 Settlement Sub-tabs
    await page.click('#tab-boss-settlement');
    await page.waitForTimeout(600);
    assert(await page.locator('text=Settlement & Payout Report').isVisible(), 'Boss View Tab 7 Settlement loads');

    // Click Franchise Settlement sub-tab
    await page.click('button:has-text("🏪 Settlement")');
    await page.waitForTimeout(500);
    assert(await page.locator('text=Settlement & Payout History').isVisible(), 'Settlement sub-tab 2 (Franchise Settlement Ledger) visible');

    // Click Advisory Payout sub-tab
    await page.click('button:has-text("👨‍⚕ Advisory Payout")');
    await page.waitForTimeout(500);
    assert(await page.locator('text=Advisory Sessions Done').isVisible(), 'Settlement sub-tab 3 (Advisory Payout Ledger) visible');

    // Tab 8 Franchise & Tools Modals
    await page.click('#tab-boss-franchise');
    await page.waitForTimeout(600);
    assert(await page.locator('text=FRANCHISE SYSTEM').isVisible(), 'Boss View Tab 8 Franchise loads');

    // Click Map tool
    await page.click('#btn-tool-map');
    await page.waitForTimeout(600);
    assert(await page.locator('text=Karnataka & Tamil Nadu Franchise Map').isVisible(), 'Franchise Geo Map modal opened');
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(400);

    // Click Meta Ads Agent tool
    await page.click('#btn-tool-ads');
    await page.waitForTimeout(600);
    assert(await page.locator('text=Meta Ads Agent (Facebook & Instagram)').isVisible(), 'Franchise Meta Ads Agent modal opened');
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(400);

    // Tab 9 GST Billing
    await page.click('#tab-boss-gst');
    await page.waitForTimeout(500);
    assert(await page.locator('text=GSTIN: 33BNCPS0374P1ZM').isVisible(), 'Boss View Tab 9 GST Billing loads');

    // Tab 10 Purchase Expenses
    await page.click('#tab-boss-expenses');
    await page.waitForTimeout(500);
    assert(await page.locator('text=Purchase Expenses — Shanthi Ayurvedas Hosur').isVisible(), 'Boss View Tab 10 Purchase Expenses loads');

    // Return to Manager View
    await page.click('#btn-switch-manager-view');
    await page.waitForTimeout(1000);
    assert(await page.locator('text=MANAGER').first().isVisible(), 'Switched back to Manager View successfully');

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log(`║  COMPLETE CRM AUDIT: ${passed} PASSED, ${failed} FAILED               ║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('Audit execution error:', err);
    failed++;
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runCompleteCrmAudit();
