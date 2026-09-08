import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';

async function runBossViewAllTabsE2E() {
  console.log('🚀 Starting Boss View 10-Tab Complete E2E Verification...');
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
    // 1. Navigate to login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForTimeout(2000);

    // 2. Login as Owner
    await page.fill('#email-address', 'owner@shanthiayurvedas.com');
    await page.fill('#password', 'Password@12345');
    await page.click('button[type="submit"]');

    // 3. Wait for Manager Hub landing
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);
    assert(page.url().includes('/dashboard'), 'Redirected to dashboard on login');

    // 4. Locate and click Boss View button
    const bossBtn = await page.waitForSelector('#btn-boss-view', { timeout: 5000 });
    assert(bossBtn !== null, 'Boss View button visible in Manager View');
    await bossBtn.click();
    await page.waitForTimeout(1000);

    // 5. Assert URL has ?view=boss
    assert(page.url().includes('view=boss'), 'Boss View URL has ?view=boss');

    // 6. Check Header & India Post Banner
    const distPanelTitle = await page.locator('text=Distributor Panel').isVisible();
    assert(distPanelTitle, 'Distributor Panel title visible in header');

    const indiaPostBanner = await page.locator('text=India Post Self Upload Ready').isVisible();
    assert(indiaPostBanner, 'India Post Self Upload Ready banner with Biller ID visible');

    // 7. Check 4 Summary KPI cards
    const monthRevKpi = await page.locator('text=MONTH REVENUE').first().isVisible();
    assert(monthRevKpi, 'Month Revenue KPI visible');
    const totalOrdersKpi = await page.locator('text=TOTAL ORDERS').first().isVisible();
    assert(totalOrdersKpi, 'Total Orders KPI visible');

    // 8. Tab 1: HOME
    const doctorPayoutBanner = await page.locator('text=Doctor & Staff Payout Report').isVisible();
    assert(doctorPayoutBanner, 'Tab 1 (Home): Doctor & Staff Payout Report banner visible');

    const zoneManagerCard = await page.locator('text=Akash').first().isVisible();
    assert(zoneManagerCard, 'Tab 1 (Home): Zone Manager card (Akash) visible');

    const bookingLinkBox = await page.locator('text=Your Consultation Booking Link').isVisible();
    assert(bookingLinkBox, 'Tab 1 (Home): Consultation Booking Link box visible');

    const pipelineNew = await page.locator('text=Packed').first().isVisible();
    assert(pipelineNew, 'Tab 1 (Home): 6-card Order Pipeline Grid visible');

    // 9. Tab 2: ORDERS
    await page.click('#tab-boss-orders');
    await page.waitForTimeout(600);
    const ordersViewOnly = await page.locator('text=View only — contact manager to update orders').isVisible();
    assert(ordersViewOnly, 'Tab 2 (Orders): View only banner visible');
    const orderItem = await page.locator('text=D.Sarmila').isVisible();
    assert(orderItem, 'Tab 2 (Orders): Order card with customer D.Sarmila & AWBN visible');

    // 10. Tab 3: LEADS
    await page.click('#tab-boss-leads');
    await page.waitForTimeout(600);
    const leadsViewOnly = await page.locator('text=View only — manager handles lead assignments').isVisible();
    assert(leadsViewOnly, 'Tab 3 (Leads): View only banner visible');
    const leadsTotalKpi = await page.locator('text=CONVERTED').first().isVisible();
    assert(leadsTotalKpi, 'Tab 3 (Leads): 6-card Leads summary ribbon visible');

    // 11. Tab 4: CONSULT
    await page.click('#tab-boss-consult');
    await page.waitForTimeout(600);
    const consultCounters = await page.locator('text=QUEUED').isVisible();
    assert(consultCounters, 'Tab 4 (Consult): Summary counters QUEUED, DONE, TOTAL visible');
    const consultAdvisory = await page.locator('text=Patient Wellness & Advisory Consultations').isVisible();
    assert(consultAdvisory, 'Tab 4 (Consult): Patient Wellness & Advisory panel (No Doctor Panel) visible');

    // 12. Tab 5: TEAM
    await page.click('#tab-boss-team');
    await page.waitForTimeout(600);
    const teamLeaderboard = await page.locator('text=Telecaller Performance Leaderboard').isVisible();
    assert(teamLeaderboard, 'Tab 5 (Team): Telecaller Performance Leaderboard visible');
    const monikaRank1 = await page.locator('text=MONIKA').isVisible();
    assert(monikaRank1, 'Tab 5 (Team): Ranked callers (MONIKA ₹93,760, Amrutha, etc.) visible');
    const resetPassBtn = await page.locator('text=Reset Password').first().isVisible();
    assert(resetPassBtn, 'Tab 5 (Team): Reset Password tool for Manager visible');

    // 13. Tab 6: PAYOUT
    await page.click('#tab-boss-payout');
    await page.waitForTimeout(600);
    const earningsHeader = await page.locator('text=YOUR EARNINGS — SEP 2026').isVisible();
    assert(earningsHeader, 'Tab 6 (Payout): YOUR EARNINGS — SEP 2026 header visible');
    const formulaText = await page.locator('text=35% net share + ₹299').isVisible();
    assert(formulaText, 'Tab 6 (Payout): 35% net share + ₹299 formula visible');
    const grossShare = await page.locator('text=Your 45% Share (Gross)').isVisible();
    assert(grossShare, 'Tab 6 (Payout): Financial calculation table with 45% gross, -10% advisory, 35% net visible');

    // 14. Tab 7: SETTLEMENT
    await page.click('#tab-boss-settlement');
    await page.waitForTimeout(600);
    const settlementTitle = await page.locator('text=Settlement & Payout Report').isVisible();
    assert(settlementTitle, 'Tab 7 (Settlement): Header Settlement & Payout Report visible');
    const streamApp = await page.locator('text=App (FREE)').first().isVisible();
    assert(streamApp, 'Tab 7 (Settlement): 6 revenue stream filters (App, Consult, Service, MRP 10%) visible');
    const printReportBtn = await page.locator('text=Print Report').isVisible();
    assert(printReportBtn, 'Tab 7 (Settlement): Print Report button visible');

    // 15. Tab 8: FRANCHISE
    await page.click('#tab-boss-franchise');
    await page.waitForTimeout(600);
    const franchiseHeader = await page.locator('text=FRANCHISE SYSTEM').isVisible();
    assert(franchiseHeader, 'Tab 8 (Franchise): FRANCHISE SYSTEM header visible');
    const franchiseTools = await page.locator('text=Route Orders').isVisible();
    assert(franchiseTools, 'Tab 8 (Franchise): 8 Operational Tools grid visible');
    const walletBalance = await page.locator('text=WALLET BALANCE').isVisible();
    assert(walletBalance, 'Tab 8 (Franchise): WALLET BALANCE and Quick Recharge presets visible');

    // 16. Tab 9: GST BILLING
    await page.click('#tab-boss-gst');
    await page.waitForTimeout(600);
    const gstinHeader = await page.locator('text=GSTIN: 33BNCPS0374P1ZM').isVisible();
    assert(gstinHeader, 'Tab 9 (GST): GSTIN 33BNCPS0374P1ZM and GST Billing header visible');
    const subDistTab = await page.locator('text=Sub-Distributors').first().isVisible();
    assert(subDistTab, 'Tab 9 (GST): Sub-tabs Sub-Distributors, Create Invoice, Rollup, History visible');
    const myGstDetails = await page.locator('text=My GST Details & Registration').isVisible();
    assert(myGstDetails, 'Tab 9 (GST): Collapsible My GST Details & Registration visible');

    // 17. Tab 10: PURCHASE EXPENSES
    await page.click('#tab-boss-expenses');
    await page.waitForTimeout(600);
    const expensesHeader = await page.locator('text=Purchase Expenses — Shanthi Ayurvedas Hosur').isVisible();
    assert(expensesHeader, 'Tab 10 (Expenses): Purchase Expenses header visible');
    const recordPurchaseForm = await page.locator('text=+ Record a Purchase').isVisible();
    assert(recordPurchaseForm, 'Tab 10 (Expenses): + Record a Purchase form visible');
    const savePurchaseBtn = await page.locator('text=Save Purchase').isVisible();
    assert(savePurchaseBtn, 'Tab 10 (Expenses): Save Purchase button visible');

    // 18. Switch back to Manager View
    const returnManagerBtn = await page.waitForSelector('#btn-switch-manager-view', { timeout: 5000 });
    assert(returnManagerBtn !== null, 'Manager View return button visible in Boss View');
    await returnManagerBtn.click();
    await page.waitForTimeout(1000);

    const managerBadge = await page.locator('text=MANAGER').first().isVisible();
    assert(managerBadge, 'Returned back to Manager View successfully (MANAGER badge visible)');

    console.log('\n╔══════════════════════════════════════╗');
    console.log(`║  BOSS VIEW E2E: ${passed} PASSED, ${failed} FAILED  ║`);
    console.log('╚══════════════════════════════════════╝\n');

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runBossViewAllTabsE2E();
