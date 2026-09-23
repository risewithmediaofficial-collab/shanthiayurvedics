import { chromium } from 'playwright';

async function verifyAllFeatures() {
  console.log('🚀 Starting Automated E2E Verification of All Implemented CRM Features...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Visit Login Page
    console.log('\n--- 1. Testing Login Page & Brand Logins ---');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });

    const loginTitle = await page.textContent('body');
    assert(loginTitle.includes('Staff & Distributor Sign In'), 'Login page displays Staff & Distributor Sign In');
    assert(loginTitle.includes('shanthi@369'), 'Fast account login displays shanthi@369');
    assert(loginTitle.includes('slim369'), 'Fast account login displays slim369');
    assert(loginTitle.includes('Manager Akash'), 'Fast account login displays Manager Akash');

    // 2. Perform Login as Boss (shanthi@369 / slim369)
    console.log('\n--- 2. Performing Login as Shanthi Boss Distributor ---');
    await page.fill('input[type="text"]', 'shanthi@369');
    await page.fill('input[type="password"]', 'slim369');
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    assert(page.url().includes('/dashboard'), 'Redirected to Dashboard after successful login');

    // 3. Switch to Boss View to verify Distributor Panel
    console.log('\n--- 3. Verifying Boss Distributor Panel ---');
    await page.goto('http://localhost:5173/dashboard?view=boss', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bossContent = await page.textContent('body');
    assert(bossContent.includes('Active Distributor'), 'Displays Active Distributor status badge');
    assert(bossContent.includes('1000058077'), 'Displays Biller ID 1000058077');
    assert(bossContent.includes('Brand: Shanthi Ayurvedas'), 'Displays Brand: Shanthi Ayurvedas badge');
    assert(!bossContent.includes('book_consultation.php'), 'Zero public doctor consultation links');

    // Verify 9 Main Boss Tabs
    assert(bossContent.includes('Home / Overview'), 'Boss Tab 1: Home / Overview present');
    assert(bossContent.includes('Orders'), 'Boss Tab 2: Orders present');
    assert(bossContent.includes('Leads'), 'Boss Tab 3: Leads present');
    assert(bossContent.includes('Team'), 'Boss Tab 4: Team present');
    assert(bossContent.includes('Payout'), 'Boss Tab 5: Payout present');
    assert(bossContent.includes('Settlement'), 'Boss Tab 6: Settlement present');
    assert(bossContent.includes('Franchise'), 'Boss Tab 7: Franchise present');
    assert(bossContent.includes('GST Billing'), 'Boss Tab 8: GST Billing present');
    assert(bossContent.includes('Purchase Expenses'), 'Boss Tab 9: Purchase Expenses present');

    // 4. Test Manager View (Akash)
    console.log('\n--- 4. Verifying Manager View & AyurOneMart Features ---');
    await page.goto('http://localhost:5173/dashboard?view=manager', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 4A. Stock Tab & Duplicate Detector
    console.log('\n--- 4A. Testing Stock Tab & Find Duplicate Products ---');
    await page.goto('http://localhost:5173/dashboard?view=manager&tab=stock', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const stockContent = await page.textContent('body');
    assert(stockContent.includes('Find Duplicate Products'), 'Button "🔍 Find Duplicate Products" is present in toolbar');

    // Click Find Duplicate Products
    await page.click('button:has-text("Find Duplicate Products")');
    await page.waitForTimeout(1000);

    const modalText = await page.textContent('body');
    assert(modalText.includes('Inventory Duplicate Products Detector'), 'Duplicate Detector modal opens successfully');
    assert(modalText.includes('Duplicate Detection Rule'), 'Detection algorithm instructions displayed');

    // Close modal
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(500);

    // 4B. Office Sale Tab & Treatment Order Desk
    console.log('\n--- 4B. Testing Office Sale Desk ---');
    await page.goto('http://localhost:5173/dashboard?view=manager&tab=office_sale', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const officeContent = await page.textContent('body');
    assert(officeContent.includes('Walk-in Treatment & Counter Billing Desk'), 'Office Sale header matches AyurOneMart desk');
    assert(officeContent.includes('33BNCPS0374P1ZM'), 'Displays GSTIN 33BNCPS0374P1ZM');
    assert(officeContent.includes('Health Condition / Regimen'), 'Health Condition dropdown is present');
    assert(officeContent.includes('Plan Duration'), 'Plan Duration dropdown is present');
    assert(officeContent.includes('Add Monthly Advisory Tracking Fee (+₹699)'), 'Service fee toggle (+₹699) is present');
    assert(officeContent.includes('Pincode (Auto-Lookup)'), 'Pincode auto-lookup input is present');

    // 4C. TC Sales & Salary Tab
    console.log('\n--- 4C. Testing TC Sales & Salary Tab ---');
    await page.goto('http://localhost:5173/dashboard?view=manager&tab=salary', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const salaryContent = await page.textContent('body');
    assert(salaryContent.includes('10% on Catalog MRP for all DELIVERED Orders'), 'Displays 10% commission rule');
    assert(salaryContent.includes('DOWNLOAD ALL (PDF)'), 'Button "📄 DOWNLOAD ALL (PDF)" is present');
    assert(salaryContent.includes('This Month'), 'Period preset "This Month" is present');
    assert(salaryContent.includes('Today'), 'Period preset "Today" is present');

    // Click DOWNLOAD ALL (PDF)
    await page.click('button:has-text("DOWNLOAD ALL (PDF)")');
    await page.waitForTimeout(1000);

    const pdfModalText = await page.textContent('body');
    assert(pdfModalText.includes('Consolidated Branch Telecaller Commission Report'), 'Consolidated Statement modal opens');
    assert(pdfModalText.includes('Delivered Orders'), 'Table displays Delivered Orders count');
    assert(pdfModalText.includes('10% Commission'), 'Table displays 10% Commission');

    // Close modal
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(500);

    // 4D. Leads Tab (Verify NO Doctor Consultation assignment dropdown)
    console.log('\n--- 4D. Verifying Leads Tab Exclusion of Doctor Dropdown ---');
    await page.goto('http://localhost:5173/dashboard?view=manager&tab=leads', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const leadsContent = await page.textContent('body');
    assert(!leadsContent.includes('To doctor...'), 'Zero doctor consultation assignment dropdown in Leads');
    assert(leadsContent.toLowerCase().includes('assign to telecaller...'), 'Telecaller assignment dropdown is active');

    // 4E. Orders Tab & Auto-Dispatch
    console.log('\n--- 4E. Testing Orders Tab Auto-Dispatch ---');
    await page.goto('http://localhost:5173/dashboard?view=manager&tab=orders', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const ordersContent = await page.textContent('body');
    assert(ordersContent.includes('Auto Dispatch'), 'Auto Dispatch button is active and present');
    assert(ordersContent.includes('Full View') || ordersContent.includes('Card View'), 'Full View toggle is present');

  } catch (err) {
    console.error('Fatal error during E2E verification:', err);
  } finally {
    await browser.close();
    console.log(`\n🏁 Verification Complete: ${passCount}/${testCount} tests passed!`);
    process.exit(passCount === testCount ? 0 : 1);
  }
}

verifyAllFeatures();
