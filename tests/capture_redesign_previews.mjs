import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as Owner
  await page.goto('http://localhost:5173/login');
  await page.fill('#email-address', 'owner@shanthiayurvedas.com');
  await page.fill('#password', 'Password@12345');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(2500);

  // 1. Manager View with Trends & Pipeline Track
  await page.screenshot({ path: 'tests/manager_view_redesign.png', fullPage: false });
  console.log('✅ Captured Manager View redesign screenshot');

  // 2. Orders Tab with Fulfillment Pipeline Layout Bar
  await page.click('button:has-text("ORDERS")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/orders_pipeline_redesign.png', fullPage: false });
  console.log('✅ Captured Orders Pipeline redesign screenshot');

  // 3. Switch to Boss View
  await page.click('#btn-boss-view');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tests/boss_view_redesign.png', fullPage: false });
  console.log('✅ Captured Boss View redesign screenshot');

  // 4. Telecaller View
  await page.evaluate(() => {
    window.history.pushState({}, '', '/dashboard?view=telecaller');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/telecaller_view_redesign.png', fullPage: false });
  console.log('✅ Captured Telecaller View redesign screenshot');

  await browser.close();
  console.log('Done capturing all UI previews!');
}

capture().catch(console.error);
