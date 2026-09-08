import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  
  await page.goto('http://localhost:5173/login');
  await page.fill('#email-address', 'owner@shanthiayurvedas.com');
  await page.fill('#password', 'Password@12345');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('#tab-manager-team', { timeout: 15000 });
  await page.click('#tab-manager-team');
  await page.waitForTimeout(2000);
  await page.waitForSelector('#btn-top-open-telecaller', { timeout: 10000 });

  const outPath = 'C:/Users/Sathish kumar/.gemini/antigravity-ide/brain/60cad813-d5dc-408b-be3d-1f5656c57582/team_tab_table_full.png';
  await page.screenshot({ path: outPath, fullPage: true });
  await browser.close();
  console.log('Saved screenshot to:', outPath);
}

capture().catch(console.error);
