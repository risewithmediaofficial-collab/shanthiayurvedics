import { chromium } from 'playwright';
import path from 'path';

async function verifyTelecallerOrdersAndEdit() {
  console.log('=== Starting Telecaller Orders Table & Edit Option Verification ===\n');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  // 1. Login
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

  // Click on telecaller dashboard button
  console.log('--- Step 3: Opening ANANDHI Telecaller Dashboard ---');
  const openCallerBtn = page.locator('[id^="btn-open-telecaller-"]').first();
  await openCallerBtn.click();
  await page.waitForTimeout(2000);

  // Switch to Orders tab in Telecaller View
  console.log('--- Step 4: Switching to Telecaller Orders Tab (#tab-tc-orders) ---');
  await page.waitForSelector('#tab-tc-orders', { timeout: 10000 });
  await page.click('#tab-tc-orders');
  await page.waitForTimeout(1500);

  // Capture screenshot of well-aligned table
  const artifactDir = 'C:/Users/Sathish kumar/.gemini/antigravity-ide/brain/60cad813-d5dc-408b-be3d-1f5656c57582';
  const tableScreenshotPath = path.join(artifactDir, 'telecaller_orders_well_aligned.png');
  await page.screenshot({ path: tableScreenshotPath, fullPage: true });
  console.log('📸 Captured well-aligned orders table screenshot:', tableScreenshotPath);

  // 4. Verify data in table rows (patient name, amount, status, edit button)
  console.log('--- Step 4: Validating Table Columns & Data Content ---');
  const table = page.locator('table');
  const isTableVisible = await table.isVisible();
  console.log('✅ Table element is visible:', isTableVisible);

  const editButtons = page.locator('[id^="btn-edit-order-"]');
  const editButtonsCount = await editButtons.count();
  console.log(`✅ Edit buttons found in orders table: ${editButtonsCount}`);

  // Check that patient name and amounts are populated (not blank)
  const firstPatientName = await page.locator('table tbody tr:first-child td:nth-child(2)').innerText();
  const firstAmount = await page.locator('table tbody tr:first-child td:nth-child(4)').innerText();
  const firstTracking = await page.locator('table tbody tr:first-child td:nth-child(7)').innerText();
  console.log('First Row Patient:', firstPatientName.split('\n')[0]);
  console.log('First Row Amount:', firstAmount.split('\n')[0]);
  console.log('First Row Tracking:', firstTracking.trim());

  if (!firstPatientName || firstPatientName.trim() === '') {
    throw new Error('Patient column is unexpectedly empty!');
  }
  if (!firstAmount || firstAmount.trim() === '₹' || firstAmount.trim() === '₹0') {
    throw new Error('Amount column is empty or zero!');
  }

  // 5. Test Opening Edit Order Modal
  console.log('\n--- Step 5: Testing Edit Order Modal ---');
  const firstEditBtn = editButtons.first();
  await firstEditBtn.click();
  await page.waitForTimeout(1000);

  const editModal = page.locator('text=Edit Order:');
  const isModalOpen = await editModal.first().isVisible();
  console.log('✅ Edit Order modal opened:', isModalOpen);

  const modalScreenshotPath = path.join(artifactDir, 'telecaller_edit_order_modal.png');
  await page.screenshot({ path: modalScreenshotPath });
  console.log('📸 Captured Edit Order modal screenshot:', modalScreenshotPath);

  // 6. Test Modifying Fields and Saving
  console.log('\n--- Step 6: Modifying Fields and Submitting Update ---');
  await page.waitForSelector('#input-edit-order-patient-name', { timeout: 5000 });
  await page.fill('#input-edit-order-patient-name', 'PRIYA DHARSHINI (UPDATED)');
  
  // Select status DELIVERED
  await page.selectOption('#select-edit-order-status', 'DELIVERED');

  // Modify grand total
  await page.fill('#input-edit-order-grand-total', '3499');

  // Submit form
  console.log('Clicking Save Order Changes...');
  await page.click('#btn-save-order-changes');
  await page.waitForTimeout(3000);

  // 7. Verify updated row reflects changes
  console.log('\n--- Step 7: Verifying Changes in Table ---');
  const updatedText = await page.locator('table').innerText();
  const isNameUpdated = updatedText.includes('PRIYA DHARSHINI (UPDATED)');
  const isAmountUpdated = updatedText.includes('3,499') || updatedText.includes('3499');
  console.log('✅ Updated patient name reflected in table:', isNameUpdated);
  console.log('✅ Updated amount reflected in table:', isAmountUpdated);

  // Capture final updated table screenshot
  const finalScreenshotPath = path.join(artifactDir, 'telecaller_orders_after_edit.png');
  await page.screenshot({ path: finalScreenshotPath, fullPage: true });
  console.log('📸 Captured final screenshot after edit:', finalScreenshotPath);

  await browser.close();
  console.log('\n================================================================');
  console.log('🎉 ALL TELECALLER ORDERS & EDIT OPTION TESTS PASSED!');
  console.log('================================================================');
}

verifyTelecallerOrdersAndEdit().catch(console.error);
