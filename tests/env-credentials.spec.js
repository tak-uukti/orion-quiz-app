// Test .env Credential Manipulation
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const CLIENT_URL = 'http://localhost:5173';
const ENV_PATH = path.join(__dirname, '..', 'client', '.env');
const ENV_BACKUP_PATH = path.join(__dirname, '..', 'client', '.env.backup');

// Helper functions
function updateEnvFile(username, password) {
    const envContent = `VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
VITE_ADMIN_USER=${username}
VITE_ADMIN_PASS=${password}
`;
    fs.writeFileSync(ENV_PATH, envContent);
    console.log(`✓ Updated .env: username=${username}, password=${password}`);
}

function restoreEnvFile() {
    fs.copyFileSync(ENV_BACKUP_PATH, ENV_PATH);
    console.log('✓ Restored original .env file');
}

// Wait for Vite to reload (important!)
async function waitForViteReload() {
    await new Promise(resolve => setTimeout(resolve, 3000));
}

// ============================================================================
// TEST SUITE: .env Credential Manipulation
// ============================================================================

test.describe('.env Credential Manipulation Tests', () => {
    test.afterAll(async () => {
        // Always restore original .env after all tests
        restoreEnvFile();
        console.log('\n✅ .env file restored to original state');
    });

    test('3.1.1: Change admin password in .env', async ({ page }) => {
        console.log('\n▶ Test 3.1.1: Change Admin Password');

        // Update .env with new password
        updateEnvFile('admin1', 'NewPassword123');
        await waitForViteReload();

        // Try login with OLD password - should FAIL
        await page.goto(`${CLIENT_URL}/login`);
        await page.fill('input[placeholder="Username"]', 'admin1');
        await page.fill('input[placeholder="Password"]', 'Orion@2026'); // OLD password
        await page.click('button[type="submit"]:has-text("Login")');

        // Should show error
        await expect(page.locator('text=Invalid credentials')).toBeVisible();
        console.log('✓ Old password rejected');

        // Clear form
        await page.reload();

        // Try login with NEW password - should SUCCEED
        await page.fill('input[placeholder="Username"]', 'admin1');
        await page.fill('input[placeholder="Password"]', 'NewPassword123'); // NEW password
        await page.click('button[type="submit"]:has-text("Login")');

        // Should redirect to dashboard
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*\/host/);
        console.log('✓ New password accepted');

        // Restore for next test
        restoreEnvFile();
        await waitForViteReload();
    });

    test('3.1.2: Change admin username in .env', async ({ page }) => {
        console.log('\n▶ Test 3.1.2: Change Admin Username');

        // Update .env with new username
        updateEnvFile('testadmin', 'Orion@2026');
        await waitForViteReload();

        // Try login with OLD username - should FAIL
        await page.goto(`${CLIENT_URL}/login`);
        await page.fill('input[placeholder="Username"]', 'admin1'); // OLD username
        await page.fill('input[placeholder="Password"]', 'Orion@2026');
        await page.click('button[type="submit"]:has-text("Login")');

        // Should show error
        await expect(page.locator('text=Invalid credentials')).toBeVisible();
        console.log('✓ Old username rejected');

        // Clear form
        await page.reload();

        // Try login with NEW username - should SUCCEED
        await page.fill('input[placeholder="Username"]', 'testadmin'); // NEW username
        await page.fill('input[placeholder="Password"]', 'Orion@2026');
        await page.click('button[type="submit"]:has-text("Login")');

        // Should redirect to dashboard
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*\/host/);
        console.log('✓ New username accepted');

        // Restore for next test
        restoreEnvFile();
        await waitForViteReload();
    });

    test('3.1.3: Change both username and password', async ({ page, browser }) => {
        console.log('\n▶ Test 3.1.3: Change Both Username and Password');

        // Update .env with both new credentials
        updateEnvFile('superadmin', 'SuperSecure2026!');
        await waitForViteReload();

        // Login with new credentials
        await page.goto(`${CLIENT_URL}/login`);
        await page.fill('input[placeholder="Username"]', 'superadmin');
        await page.fill('input[placeholder="Password"]', 'SuperSecure2026!');
        await page.click('button[type="submit"]:has-text("Login")');

        // Should redirect to dashboard
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*\/host/);
        console.log('✓ New credentials accepted');

        // Now test full game flow with new credentials to ensure everything works
        console.log('🎮 Testing full game flow with new credentials...');

        // Start a game
        await page.click('button:has-text("Start")');
        await page.waitForURL(/.*\/host\/game\/.*/, { timeout: 10000 });

        const url = page.url();
        const roomId = url.split('/').pop();
        console.log(`✓ Game created with room ${roomId} using new credentials`);

        // Have a player join
        const playerContext = await browser.newContext();
        const playerPage = await playerContext.newPage();

        await playerPage.goto(CLIENT_URL);
        await playerPage.click('button:has-text("JOIN GAME")');
        await playerPage.fill('input[placeholder="Game PIN"]', roomId);
        await playerPage.fill('input[placeholder="Nickname"]', 'TestPlayer');
        await playerPage.click('button:has-text("Enter")');

        await playerPage.waitForURL(/.*\/play/, { timeout: 10000 });
        console.log('✓ Player joined successfully');

        // Verify host sees the player
        await page.waitForSelector('text=TestPlayer', { timeout: 5000 });
        await expect(page.locator('text=1 Players Waiting')).toBeVisible();
        console.log('✓ Host sees player - full game flow working with new credentials');

        await playerContext.close();

        // Restore for next test
        restoreEnvFile();
        await waitForViteReload();
    });

    test('3.1.4: Empty credentials should fail', async ({ page }) => {
        console.log('\n▶ Test 3.1.4: Empty Credentials');

        // Update .env with empty credentials
        updateEnvFile('', '');
        await waitForViteReload();

        // Try to login with any credentials
        await page.goto(`${CLIENT_URL}/login`);
        await page.fill('input[placeholder="Username"]', 'anyuser');
        await page.fill('input[placeholder="Password"]', 'anypass');
        await page.click('button[type="submit"]:has-text("Login")');

        // Should show error
        await expect(page.locator('text=Invalid credentials')).toBeVisible();
        console.log('✓ Empty .env credentials correctly rejected');

        // Restore
        restoreEnvFile();
        await waitForViteReload();
    });

    test('3.1.5: Restore original credentials and verify', async ({ page }) => {
        console.log('\n▶ Test 3.1.5: Restore Original Credentials');

        // Ensure original .env is restored
        restoreEnvFile();
        await waitForViteReload();

        // Login with original credentials
        await page.goto(`${CLIENT_URL}/login`);
        await page.fill('input[placeholder="Username"]', 'admin1');
        await page.fill('input[placeholder="Password"]', 'Orion@2026');
        await page.click('button[type="submit"]:has-text("Login")');

        // Should succeed
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*\/host/);
        console.log('✓ Original credentials work after restoration');
    });
});
