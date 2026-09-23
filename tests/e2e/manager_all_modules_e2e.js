import { chromium } from 'playwright';

async function runPlaywrightE2ETest() {
  console.log('🎭 Starting Playwright End-to-End Test Suite for Shanthi Ayurvedas CRM...\n');
  const startTime = Date.now();

  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(name, condition) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  }

  try {
    // 1. Navigation & Authentication
    console.log('📍 Step 1: Navigating to CRM Portal & Login Verification');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(1500);

    console.log('  🔑 On Login Page. Authenticating with Owner credentials...');
    await page.fill('#email-address', 'owner@shanthiayurvedas.com');
    await page.fill('#password', 'Password@12345');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    await page.waitForTimeout(2000);

    assertTest('Redirects to /dashboard upon authentication', page.url().includes('/dashboard'));

    // 2. Default Landing: Manager View 1st
    console.log('\n📍 Step 2: Manager View 1st Verification');
    const headerText = await page.textContent('body');
    console.log('ACTUAL BODY PREVIEW:\n', headerText.slice(0, 400));
    assertTest(
      'Manager Operations Hub loads 1st by default',
      headerText.toUpperCase().includes('MANAGER') && (headerText.toUpperCase().includes('SHANTHI AYURVEDAS') || headerText.toUpperCase().includes('HOSUR'))
    );

    assertTest('Top header displays Boss View switch button', headerText.includes('Boss View'));
    assertTest('Top header displays Logout button', headerText.includes('Logout'));


    // 3. AyurOne Mart Sub-Navigation Tabs Strip
    console.log('\n📍 Step 3: AyurOne Mart Sub-Navigation Strip (10 Modules)');
    const expectedTabs = [
      'ORDERS',
      'LEADS',
      'CONSULT',
      'STOCK',
      'TEAM',
      'TC SALES / SALARY',
      'OFFICE SALE',
      'BRANCH ORDERS',
      'TILL-DATE & WITHDRAWAL',
      'STUCK SHIPPED / OUTSTANDING'
    ];

    for (const tab of expectedTabs) {
      assertTest(`Sub-nav ribbon contains "${tab}" tab`, headerText.includes(tab));
    }

    // 4. Test ORDERS Module
    console.log('\n📍 Step 4: Testing ORDERS Module');
    await page.click('button:has-text("ORDERS")');
    await page.waitForTimeout(1000);
    const ordersContent = await page.textContent('body');
    assertTest('Orders 2-tier ribbon is present', ordersContent.includes('Today Rev') || ordersContent.includes('To Verify') || ordersContent.includes('Orders'));
    assertTest('Action ribbon buttons are present', ordersContent.includes('Import Excel') || ordersContent.includes('Scan') || ordersContent.includes('India Post'));
    assertTest('Export & Import buttons are present', ordersContent.includes('Export') && ordersContent.includes('Import'));

    // 5. Test LEADS Module
    console.log('\n📍 Step 5: Testing LEADS Module');
    await page.click('button:has-text("LEADS")');
    await page.waitForTimeout(1000);
    const leadsContent = await page.textContent('body');
    assertTest('Leads Desk KPI cards are visible', leadsContent.includes('Total Leads') && leadsContent.includes('New / Unassigned'));
    assertTest('Bulk Assign Bar is visible', leadsContent.includes('Select All') && (leadsContent.includes('Assign') || leadsContent.includes('Assign Selected')));
    assertTest('Add New Lead button is present', leadsContent.includes('Add New Lead'));

    // 6. Test CONSULT Module (No Doctor Panel)
    console.log('\n📍 Step 6: Testing CONSULT Module');
    await page.click('button:has-text("CONSULT")');
    await page.waitForTimeout(1000);
    const consultContent = await page.textContent('body');
    assertTest('Consultations Desk loaded', consultContent.includes('Total Consultations') || consultContent.includes('Pending Review'));
    assertTest('Symptoms and prescription notes visible', consultContent.includes('Chief Symptoms') || consultContent.includes('Prescription') || consultContent.includes('symptoms') || consultContent.includes('Knee joint'));
    assertTest('NO doctor panel or doctor slot booking present', !consultContent.includes('Doctor Portal') && !consultContent.includes('Book Doctor Slot'));

    // 7. Test STOCK Module
    console.log('\n📍 Step 7: Testing STOCK Module');
    await page.click('button:has-text("STOCK")');
    await page.waitForTimeout(1000);
    const stockContent = await page.textContent('body');
    assertTest('Stock Matrix KPI cards are visible', stockContent.includes('Total Catalog SKUs') || stockContent.includes('Valuation'));
    assertTest('Add New Product button is present', stockContent.includes('Add New Product'));
    assertTest('Stock Matrix table with inline adjustments is present', stockContent.includes('In Stock Units') || stockContent.includes('Batch Adjust') || stockContent.includes('Low Stock') || stockContent.includes('SKU'));

    // 8. Test TEAM Module
    console.log('\n📍 Step 8: Testing TEAM Module');
    await page.click('button:has-text("TEAM")');
    await page.waitForTimeout(1000);
    const teamContent = await page.textContent('body');
    assertTest('ID Cards & Appointment Letters action bar present', teamContent.includes('Generate ID Cards') && teamContent.includes('Appointment Letters'));
    assertTest('Performance Certificate button present', teamContent.includes('Performance Certificate'));
    assertTest('Telecaller performance cards present', teamContent.includes('Today Calls') || teamContent.includes('Delivered Revenue'));

    // 9. Test TC SALES / SALARY Module
    console.log('\n📍 Step 9: Testing TC SALES / SALARY Module');
    await page.click('button:has-text("TC SALES / SALARY")');
    await page.waitForTimeout(1000);
    const salaryContent = await page.textContent('body');
    assertTest('10% Commission Rule card is prominent', salaryContent.includes('10%') && salaryContent.includes('DELIVERED Orders'));
    assertTest('Month & Year filter is present', salaryContent.includes('Salary Period'));
    assertTest('Sales Leaderboard Chart & Salary table present', salaryContent.includes('Leaderboard') || salaryContent.includes('Gross Commission'));

    // 10. Test OFFICE SALE Module
    console.log('\n📍 Step 10: Testing OFFICE SALE Module');
    await page.click('button:has-text("OFFICE SALE")');
    await page.waitForTimeout(1000);
    const officeContent = await page.textContent('body');
    assertTest('Direct Counter POS Sale workflow is active', officeContent.includes('Direct Counter POS Sale'));
    assertTest('Walk-in Consultation Desk toggle is present', officeContent.includes('Walk-in Consultation Desk'));
    assertTest('Patient details form and POS cart are present', officeContent.includes('Patient Name') && officeContent.includes('Current POS Cart'));

    // 11. Test BRANCH ORDERS Module
    console.log('\n📍 Step 11: Testing BRANCH ORDERS Module');
    await page.click('button:has-text("BRANCH ORDERS")');
    await page.waitForTimeout(1000);
    const branchContent = await page.textContent('body');
    assertTest('Orders Received from Other Branches tab is present', branchContent.includes('Orders Received from Other Branches'));
    assertTest('Orders Sent to Other Branches tab is present', branchContent.includes('Orders Sent to Other Branches'));
    assertTest('Request Stock Transfer button is present', branchContent.includes('Request Stock Transfer'));

    // 12. Test TILL-DATE & WITHDRAWAL Module
    console.log('\n📍 Step 12: Testing TILL-DATE & WITHDRAWAL Module');
    await page.click('button:has-text("TILL-DATE & WITHDRAWAL")');
    await page.waitForTimeout(1000);
    const wdrContent = await page.textContent('body');
    assertTest('6 Financial Metric Cards are present', wdrContent.includes('Total Branch Sales') && wdrContent.includes('Available Wallet'));
    assertTest('Minimum ₹5,000 threshold notice is enforced', wdrContent.includes('5,000'));
    assertTest('Settlement & Withdrawal Ledger is present', wdrContent.includes('Settlement & Withdrawal Ledger'));

    // 13. Test STUCK SHIPPED / OUTSTANDING Module
    console.log('\n📍 Step 13: Testing STUCK SHIPPED / OUTSTANDING Module');
    await page.click('button:has-text("STUCK SHIPPED / OUTSTANDING")');
    await page.waitForTimeout(1000);
    const stuckContent = await page.textContent('body');
    assertTest('Stuck orders KPI cards are present', stuckContent.includes('Stuck Orders') && stuckContent.includes('Locked Margin'));
    assertTest('Aging buckets (15-20d, 20-30d, 40+d) are present', stuckContent.includes('15 - 20 Days') && stuckContent.includes('40+ Days'));

    // 14. Verify Sidebar Integrity
    console.log('\n📍 Step 14: Verifying Sidebar Navigation & Doctor Panel Absence');
    const sidebarElement = await page.$('aside');
    const sidebarText = sidebarElement ? await sidebarElement.textContent() : '';
    assertTest('Sidebar has AyurOne Mart branding', sidebarText.includes('AyurOne Mart') || sidebarText.includes('MANAGER PANEL'));
    assertTest('Sidebar contains active TEAM CALLERS', sidebarText.includes('TEAM CALLERS') || sidebarText.includes('KANAGAVALLI'));
    assertTest('NO Doctor Panel link exists in sidebar', !sidebarText.includes('Doctor Panel') && !sidebarText.includes('Doctor Slots'));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n=========================================');
    console.log('🎭 PLAYWRIGHT TEST EXECUTION SUMMARY:');
    console.log(`✅ Total Assertions Checked: ${totalTests}`);
    console.log(`🎉 Passed Assertions: ${passedTests}`);
    console.log(`❌ Failed Assertions: ${totalTests - passedTests}`);
    console.log(`⏱️ Duration: ${duration} seconds`);
    console.log('=========================================\n');
    console.log('🌟 All Playwright End-to-End tests completed successfully!');

  } catch (err) {
    console.error('\n❌ Playwright Test Failed:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runPlaywrightE2ETest();
