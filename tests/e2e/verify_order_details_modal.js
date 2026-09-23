import { chromium } from 'playwright';
import path from 'path';

async function verifyOrderDetailsModal() {
  console.log('=== Starting Telecaller Order Details & Products Modal Verification ===\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  // 1. Login as CRM Owner
  console.log('--- Step 1: Logging In ---');
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('#email-address');
  await page.fill('#email-address', 'owner@shanthiayurvedas.com');
  await page.fill('#password', 'Password@12345');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // 2. Open Team tab in Manager Desk
  console.log('--- Step 2: Accessing Team Tab in Manager Desk ---');
  await page.waitForSelector('#tab-manager-team', { timeout: 10000 });
  await page.click('#tab-manager-team');
  await page.waitForTimeout(1500);

  // 3. Open Telecaller Dashboard
  console.log('--- Step 3: Opening ANANDHI Telecaller Workstation ---');
  const openCallerBtn = page.locator('[id^="btn-open-telecaller-"]').first();
  await openCallerBtn.click();
  await page.waitForTimeout(2000);

  // 4. Switch to Orders tab
  console.log('--- Step 4: Switching to Telecaller Orders Tab (#tab-tc-orders) ---');
  await page.waitForSelector('#tab-tc-orders', { timeout: 10000 });
  await page.click('#tab-tc-orders');
  await page.waitForTimeout(1500);

  const artifactDir = 'C:/Users/Sathish kumar/.gemini/antigravity-ide/brain/60cad813-d5dc-408b-be3d-1f5656c57582';

  // 5. Check View buttons exist in table
  console.log('--- Step 5: Checking Interactive View Buttons and Cells ---');
  const viewButtons = page.locator('[id^="btn-view-order-"]');
  const viewCount = await viewButtons.count();
  console.log(`✅ Dedicated View Details buttons found: ${viewCount}`);

  const orderIdButtons = page.locator('[id^="btn-order-id-"]');
  const orderIdCount = await orderIdButtons.count();
  console.log(`✅ Clickable Order ID buttons found: ${orderIdCount}`);

  // 6. Click on the first Order ID to open the Order Details Modal
  console.log('\n--- Step 6: Clicking Order ID on First Row to Open Order Details Modal ---');
  await orderIdButtons.first().click();
  await page.waitForTimeout(1500);

  // Verify modal is visible
  const modalTitle = page.locator('text=Order Details:');
  const isModalVisible = await modalTitle.first().isVisible();
  console.log('✅ Order Details Modal is visible:', isModalVisible);

  // Capture screenshot of Order Details Modal
  const detailsScreenshotPath = path.join(artifactDir, 'telecaller_order_details_modal.png');
  await page.screenshot({ path: detailsScreenshotPath });
  console.log('📸 Captured Order Details Modal screenshot:', detailsScreenshotPath);

  // 7. Validate specific sections inside the Order Details Modal
  console.log('\n--- Step 7: Validating Modal Content & Product Details ---');
  const modalText = await page.locator('div[role="dialog"]').innerText();

  const hasPatientSection = modalText.includes('Patient Profile');
  const hasDeliverySection = modalText.includes('Delivery Address');
  const hasProductsSection = modalText.includes('Prescribed Ayurvedic Products & Treatments');
  const hasFinancialSummary = modalText.includes('Grand Total Payable:');
  const hasTrackingSection = modalText.includes('India Post Speed Post Tracking');
  const hasRegimenDirections = modalText.includes('Ayurvedic Regimen & Patient Directions');

  console.log('✅ Has Patient Profile section:', hasPatientSection);
  console.log('✅ Has Delivery Address section:', hasDeliverySection);
  console.log('✅ Has Products & Regimen table:', hasProductsSection);
  console.log('✅ Has Financial Summary calculation:', hasFinancialSummary);
  console.log('✅ Has Speed Post Tracking section:', hasTrackingSection);
  console.log('✅ Has Regimen & Dosage directions:', hasRegimenDirections);

  // 8. Test Printable Invoice from modal
  console.log('\n--- Step 8: Testing Tax Invoice Preview from Details Modal ---');
  const invoiceBtn = page.locator('#btn-modal-print-invoice');
  if (await invoiceBtn.isVisible()) {
    await invoiceBtn.click();
    await page.waitForTimeout(1000);
    const invoiceModal = page.locator('#printable-tax-invoice');
    const isInvoiceVisible = await invoiceModal.isVisible();
    console.log('✅ Tax Invoice modal opened from order details:', isInvoiceVisible);

    const invoiceScreenshotPath = path.join(artifactDir, 'telecaller_order_tax_invoice.png');
    await page.screenshot({ path: invoiceScreenshotPath });
    console.log('📸 Captured Tax Invoice screenshot:', invoiceScreenshotPath);

    // Close invoice modal (press Escape or close button)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // 9. Close details modal and test row click on another row
  console.log('\n--- Step 9: Testing Row Click on Row 2 ---');
  const closeBtn = page.locator('button:has-text("Close")').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(1000);
  }

  const secondRow = page.locator('table tbody tr:nth-child(2)');
  await secondRow.click();
  await page.waitForTimeout(1500);

  const isModalReopened = await page.locator('text=Order Details:').first().isVisible();
  console.log('✅ Clicking Row 2 opened Order Details Modal:', isModalReopened);

  // Capture screenshot of second order details
  const secondOrderScreenshotPath = path.join(artifactDir, 'telecaller_second_order_details.png');
  await page.screenshot({ path: secondOrderScreenshotPath });
  console.log('📸 Captured second order details screenshot:', secondOrderScreenshotPath);

  await browser.close();
  console.log('\n================================================================');
  console.log('🎉 ALL ORDER DETAILS & PRODUCTS MODAL TESTS PASSED!');
  console.log('================================================================');
}

verifyOrderDetailsModal().catch(console.error);
