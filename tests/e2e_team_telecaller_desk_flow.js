const { chromium } = require('playwright');
const path = require('path');

async function runTest() {
  console.log('=== Starting E2E Team Telecaller Dashboard Flow Verification ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  const check = async (label, fn) => {
    try {
      const v = await fn();
      const ok = v === true;
      console.log(`${ok ? '✅' : '❌'} ${label}: ${v}`);
      if (ok) passed++; else failed++;
    } catch (e) {
      console.log(`❌ ${label} ERROR: ${e.message}`);
      failed++;
    }
  };

  try {
    // 1. Login as CRM Owner (Manager/Boss role)
    console.log('--- Step 1: Logging in as CRM Owner ---');
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(2000);
    await page.fill('#email-address', 'owner@shanthiayurvedas.com');
    await page.fill('#password', 'Password@12345');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(3000);

    await check('Redirected to dashboard', async () => page.url().includes('/dashboard'));

    // 2. Click on "Team Callers" KPI card or Team tab in Manager View
    console.log('\n--- Step 2: Accessing Team Tab in Manager Desk ---');
    await check('Team Callers KPI card is visible', async () => page.locator('#card-manager-team-callers').isVisible());

    // Click the Team sub-nav tab
    const teamTabBtn = page.locator('#tab-manager-team');
    await check('Manager Team sub-nav tab is visible', async () => teamTabBtn.isVisible());
    await teamTabBtn.click();
    await page.waitForTimeout(2000);

    await check('URL contains tab=team', async () => page.url().includes('tab=team'));
    await check('Top Open Telecaller Console button visible', async () => page.locator('#btn-top-open-telecaller').isVisible());

    // Capture screenshot of Manager Team Tab
    const artifactDir = 'C:/Users/Sathish kumar/.gemini/antigravity-ide/brain/60cad813-d5dc-408b-be3d-1f5656c57582';
    await page.screenshot({ path: path.join(artifactDir, 'team_tab_with_open_buttons.png') });
    console.log('📸 Captured Manager Team Tab screenshot: team_tab_with_open_buttons.png');

    // 3. Check for telecaller cards and 1-click open buttons
    console.log('\n--- Step 3: Verifying Telecaller Cards and 1-Click Dashboard Open ---');
    const openCallerBtn = page.locator('[id^="btn-open-telecaller-"]').first();
    await check('At least one "Open Telecaller Dashboard" button found', async () => openCallerBtn.isVisible());

    // Click the first telecaller's dashboard button
    console.log('Clicking Open Telecaller Dashboard button...');
    await openCallerBtn.click();
    await page.waitForTimeout(3000);

    // 4. Verify Telecaller Workstation View loaded
    console.log('\n--- Step 4: Verifying Telecaller Dashboard in Supervisor Preview Mode ---');
    console.log('Current URL after click:', page.url());
    await check('URL switched to telecaller view', async () => page.url().includes('view=telecaller'));
    await check('Supervisor Mode Banner visible', async () => page.locator('text=Supervisor Preview Mode').first().isVisible());
    await check('Back to Manager Desk button visible', async () => page.locator('#btn-back-to-manager').isVisible());
    await check('Telecaller Duty Check-in toggle visible', async () => page.locator('#btn-tc-duty-toggle').isVisible());

    await page.screenshot({ path: path.join(artifactDir, 'telecaller_supervisor_preview_mode.png') });
    console.log('📸 Captured Telecaller Supervisor Preview screenshot: telecaller_supervisor_preview_mode.png');

    // 5. Click "← Back to Manager Desk"
    console.log('\n--- Step 5: Returning Back to Manager Desk ---');
    await page.locator('#btn-back-to-manager').click();
    await page.waitForTimeout(2000);
    console.log('URL after clicking Back:', page.url());
    await check('Returned to Manager Desk with tab=team', async () => page.url().includes('tab=team') && !page.url().includes('view=telecaller'));
    await check('Manager view restored (MANAGER badge)', async () => page.locator('text=MANAGER').first().isVisible());

    // 6. Test Boss View Team Leaderboard -> Telecaller Flow
    console.log('\n--- Step 6: Testing Boss View Team Leaderboard to Telecaller Console ---');
    const bossBtn = page.locator('#btn-boss-view');
    await check('Boss View button is visible', async () => bossBtn.isVisible());
    await bossBtn.click();
    await page.waitForTimeout(2500);

    await check('In Boss View (URL has view=boss)', async () => page.url().includes('view=boss'));

    // Click Team Tab in Boss View
    const bossTeamTab = page.locator('#tab-boss-team');
    await check('Boss Team tab is visible', async () => bossTeamTab.isVisible());
    await bossTeamTab.click();
    await page.waitForTimeout(2000);

    await check('Boss View Leaderboard heading visible', async () => page.locator('text=Telecaller Performance Leaderboard').first().isVisible());
    await check('Boss View Top Open Telecaller button visible', async () => page.locator('#btn-boss-top-open-telecaller').isVisible());
    const bossCallerBtn = page.locator('[id^="btn-boss-open-telecaller-"]').first();
    await check('Boss View row Dashboard button visible', async () => bossCallerBtn.isVisible());

    await page.screenshot({ path: path.join(artifactDir, 'boss_team_leaderboard_with_buttons.png') });
    console.log('📸 Captured Boss Team Leaderboard screenshot: boss_team_leaderboard_with_buttons.png');

    // Click telecaller row in Boss View
    console.log('Clicking telecaller Dashboard button in Boss View...');
    await bossCallerBtn.click();
    await page.waitForTimeout(3000);

    console.log('URL after Boss clicked caller:', page.url());
    await check('URL switched to telecaller view from Boss', async () => page.url().includes('view=telecaller'));
    await check('Back to Boss Panel button is visible in Telecaller view', async () => page.locator('#btn-back-to-boss').isVisible());

    // Click Back to Boss Panel
    await page.locator('#btn-back-to-boss').click();
    await page.waitForTimeout(2000);
    console.log('URL after returning to Boss:', page.url());
    await check('Returned back to Boss View (view=boss)', async () => page.url().includes('view=boss'));

    // 7. Test Sidebar Team Caller Click
    console.log('\n--- Step 7: Testing Sidebar Team Caller Direct Click ---');
    // Go to Manager view first
    const mgrBtn = page.locator('#btn-switch-manager-view');
    if (await mgrBtn.isVisible()) {
      await mgrBtn.click();
      await page.waitForTimeout(2000);
    }

    const sidebarCallerLink = page.locator('a[title*="Telecaller Console"]').first();
    await check('Sidebar telecaller link is visible', async () => sidebarCallerLink.isVisible());
    if (await sidebarCallerLink.isVisible()) {
      await sidebarCallerLink.click();
      await page.waitForTimeout(3000);
      await check('Sidebar link navigated to telecaller console', async () => page.url().includes('view=telecaller'));
      await check('Back to Manager Desk button available after sidebar click', async () => page.locator('#btn-back-to-manager').isVisible());
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
    console.log(`\n=== Test Results: ${passed} PASSED, ${failed} FAILED ===\n`);
  }
}

runTest();
