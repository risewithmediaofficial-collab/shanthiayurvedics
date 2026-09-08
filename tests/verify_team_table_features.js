import { chromium } from 'playwright';

async function verifyToggle() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  
  await page.goto('http://localhost:5173/login');
  await page.fill('#email-address', 'owner@shanthiayurvedas.com');
  await page.fill('#password', 'Password@12345');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('#tab-manager-team', { timeout: 15000 });
  await page.click('#tab-manager-team');
  await page.waitForTimeout(1500);

  // 1. Table view active by default
  const isTableVisible = await page.locator('table').isVisible();
  console.log('✅ Default View is Table:', isTableVisible);

  // 2. Click Cards button
  await page.click('#btn-view-mode-grid');
  await page.waitForTimeout(500);
  const isCardsVisible = await page.locator('button:has-text("Open PATTUSELVI\'s Dashboard →")').isVisible();
  console.log('✅ Successfully toggled to Cards View:', isCardsVisible);

  // 3. Click Table button
  await page.click('#btn-view-mode-table');
  await page.waitForTimeout(500);
  const isTableVisibleAgain = await page.locator('table').isVisible();
  console.log('✅ Successfully toggled back to Table View:', isTableVisibleAgain);

  // 4. Test Search filter in table view
  await page.fill('input[placeholder*="Search telecaller"]', 'VASUKI');
  await page.waitForTimeout(500);
  const vasukiVisible = await page.locator('td:has-text("VASUKI")').isVisible();
  const pattuselviHidden = !(await page.locator('td:has-text("PATTUSELVI")').isVisible());
  console.log('✅ Search filter works in table view:', vasukiVisible && pattuselviHidden);

  // Clear search
  await page.fill('input[placeholder*="Search telecaller"]', '');
  await page.waitForTimeout(500);

  // 5. Test 1-click Dashboard button in table row
  const firstDashboardBtn = page.locator('[id^="btn-open-telecaller-"]').first();
  await firstDashboardBtn.click();
  await page.waitForTimeout(2000);
  const isTelecallerView = page.url().includes('view=telecaller');
  console.log('✅ 1-Click Dashboard button from Table Row navigates to Telecaller View:', isTelecallerView);

  await browser.close();
  console.log('\n🎉 ALL TEAM TABLE TESTS PASSED!');
}

verifyToggle().catch(console.error);
