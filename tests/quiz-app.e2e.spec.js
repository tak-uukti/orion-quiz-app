// Comprehensive Quiz App End-to-End Tests
const { test, expect } = require('@playwright/test');
const {
    connectMongoDB,
    closeMongoDB,
    clearDatabase,
    getSession,
    verifySessionCreated,
    verifyPlayersAdded,
    verifyGameStatus,
    verifyResponses,
    verifyResponseAccuracy,
    verifyQuestionStartTimes,
    printSessionDetails
} = require('./mongodb-utils');

// Test configuration
const CLIENT_URL = 'http://localhost:5173';
const SERVER_URL = 'http://localhost:8000';
const ADMIN_USERNAME = 'admin1';
const ADMIN_PASSWORD = 'Orion@2026';

// Global test state
let roomId = null;

// Setup and teardown
test.beforeAll(async () => {
    await connectMongoDB();
    console.log('\n🧪 Starting Quiz App Test Suite\n');
});

test.afterAll(async () => {
    await closeMongoDB();
    console.log('\n✅ Test Suite Complete\n');
});

test.beforeEach(async () => {
    // Clear database before each test for clean state
    await clearDatabase();
});

// ============================================================================
// PHASE 2.1: Authentication Tests
// ============================================================================

test.describe('Authentication Flow', () => {
    test('2.1.1: Successful login with correct credentials', async ({ page }) => {
        console.log('\n▶ Test 2.1.1: Successful Login');

        // Navigate to home page
        await page.goto(CLIENT_URL);
        await expect(page.locator('h1')).toContainText('QUIZ LIVE');

        // Click HOST QUIZ button
        await page.click('button:has-text("HOST QUIZ")');

        // Should redirect to login
        await expect(page).toHaveURL(/.*\/login/);

        // Enter correct credentials
        await page.fill('input[placeholder="Username"]', ADMIN_USERNAME);
        await page.fill('input[placeholder="Password"]', ADMIN_PASSWORD);

        // Click login
        await page.click('button[type="submit"]:has-text("Login")');

        // Should redirect to host dashboard
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*\/host/);

        // Verify localStorage contains isAdmin=true
        const isAdmin = await page.evaluate(() => localStorage.getItem('isAdmin'));
        expect(isAdmin).toBe('true');

        console.log('✓ Login successful and redirected to dashboard');
    });

    test('2.1.2: Failed login with incorrect credentials', async ({ page }) => {
        console.log('\n▶ Test 2.1.2: Failed Login');

        await page.goto(`${CLIENT_URL}/login`);

        // Enter incorrect credentials
        await page.fill('input[placeholder="Username"]', 'wronguser');
        await page.fill('input[placeholder="Password"]', 'wrongpass');

        await page.click('button[type="submit"]:has-text("Login")');

        // Should show error message
        await expect(page.locator('text=Invalid credentials')).toBeVisible();

        // Should NOT redirect
        await expect(page).toHaveURL(/.*\/login/);

        // Verify localStorage does NOT contain isAdmin
        const isAdmin = await page.evaluate(() => localStorage.getItem('isAdmin'));
        expect(isAdmin).toBeNull();

        console.log('✓ Login correctly rejected with invalid credentials');
    });

    test('2.1.3: Protected route access without login', async ({ page }) => {
        console.log('\n▶ Test 2.1.3: Protected Route Access');

        // Try to access /host directly without logging in
        await page.goto(`${CLIENT_URL}/host`);

        // Should redirect to login
        await page.waitForURL(/.*\/login/, { timeout: 5000 });
        await expect(page).toHaveURL(/.*\/login/);

        // Now login
        await page.fill('input[placeholder="Username"]', ADMIN_USERNAME);
        await page.fill('input[placeholder="Password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]:has-text("Login")');

        // Should grant access to /host
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
        await expect(page).toHaveURL(/.*\/host/);

        console.log('✓ Protected route redirects to login, then grants access after authentication');
    });
});

// ============================================================================
// PHASE 2.2: Host Dashboard & Quiz Management
// ============================================================================

test.describe('Host Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test in this suite
        await page.goto(`${CLIENT_URL}/login`);
        await page.fill('input[placeholder="Username"]', ADMIN_USERNAME);
        await page.fill('input[placeholder="Password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]:has-text("Login")');
        await page.waitForURL(/.*\/host/, { timeout: 10000 });
    });

    test('2.2.1: View default quiz', async ({ page }) => {
        console.log('\n▶ Test 2.2.1: View Default Quiz');

        // Verify "General Knowledge" quiz is displayed
        await expect(page.locator('text=General Knowledge')).toBeVisible();
        await expect(page.locator('text=2 Questions')).toBeVisible();

        console.log('✓ Default quiz displayed correctly');
    });

    test('2.2.2: Create new quiz', async ({ page }) => {
        console.log('\n▶ Test 2.2.2: Create New Quiz');

        // Click Create New Quiz
        await page.click('button:has-text("Create New Quiz")');

        // Fill in quiz title
        await page.fill('input[placeholder="Quiz Title"]', 'Test Quiz 1');

        // Fill Question 1
        const q1Title = page.locator('input').filter({ hasText: /question.*title/i }).first();
        await q1Title.fill('What is 2+2?');

        // Fill options for Question 1
        const options = page.locator('input[placeholder*="Option"]');
        await options.nth(0).fill('3');
        await options.nth(1).fill('4');
        await options.nth(2).fill('5');
        await options.nth(3).fill('6');

        // Select correct option (index 1 for "4")
        await page.selectOption('select', '1');

        // Add second question
        await page.click('button:has-text("Add Question")');

        // Fill Question 2
        await page.fill('input[placeholder*="Question 2 Title"]', 'What color is the sky?');

        // Fill options for Question 2
        const q2Options = page.locator('input[placeholder*="Option"]');
        const optionCount = await q2Options.count();
        await q2Options.nth(optionCount - 4).fill('Red');
        await q2Options.nth(optionCount - 3).fill('Blue');
        await q2Options.nth(optionCount - 2).fill('Green');
        await q2Options.nth(optionCount - 1).fill('Yellow');

        // Save quiz
        await page.click('button:has-text("Save Quiz")');

        // Verify quiz appears in list
        await expect(page.locator('text=Test Quiz 1')).toBeVisible();
        await expect(page.locator('text=2 Questions')).toBeVisible();

        console.log('✓ New quiz created successfully');
    });
});

// ============================================================================
// PHASE 2.3-2.8: Complete Game Flow with Multiple Players
// ============================================================================

test.describe('Complete Game Flow', () => {
    test('Full game with 3 players - All phases', async ({ browser }) => {
        console.log('\n▶ Test: Full Game Flow with 3 Players');

        // Create browser contexts for host and 3 players
        const hostContext = await browser.newContext();
        const player1Context = await browser.newContext();
        const player2Context = await browser.newContext();
        const player3Context = await browser.newContext();

        const hostPage = await hostContext.newPage();
        const player1Page = await player1Context.newPage();
        const player2Page = await player2Context.newPage();
        const player3Page = await player3Context.newPage();

        try {
            // ==================== HOST: Login and Create Game ====================
            console.log('\n📝 Phase 1: Host Login and Game Creation');

            await hostPage.goto(`${CLIENT_URL}/login`);
            await hostPage.fill('input[placeholder="Username"]', ADMIN_USERNAME);
            await hostPage.fill('input[placeholder="Password"]', ADMIN_PASSWORD);
            await hostPage.click('button[type="submit"]:has-text("Login")');
            await hostPage.waitForURL(/.*\/host/, { timeout: 10000 });

            // Click Start on default quiz
            await hostPage.click('button:has-text("Start")');

            // Wait for redirect to game room
            await hostPage.waitForURL(/.*\/host\/game\/.*/, { timeout: 10000 });

            // Extract room ID from URL
            const url = hostPage.url();
            roomId = url.split('/').pop();
            console.log(`✓ Game created with Room ID: ${roomId}`);

            // Verify waiting room
            await expect(hostPage.locator(`text=${roomId}`)).toBeVisible();
            await expect(hostPage.locator('text=0 Players Waiting')).toBeVisible();

            // Database Checkpoint 1: Verify session created
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB write
            const sessionCreated = await verifySessionCreated(roomId);
            expect(sessionCreated).toBe(true);

            // ==================== PLAYERS: Join Game ====================
            console.log('\n👥 Phase 2: Players Joining');

            // Player 1 joins
            await player1Page.goto(CLIENT_URL);
            await player1Page.click('button:has-text("JOIN GAME")');
            await player1Page.fill('input[placeholder="Game PIN"]', roomId);
            await player1Page.fill('input[placeholder="Nickname"]', 'Player1');
            await player1Page.click('button:has-text("Enter")');

            await player1Page.waitForURL(/.*\/play/, { timeout: 10000 });
            await expect(player1Page.locator('text=Player1')).toBeVisible();
            console.log('✓ Player1 joined');

            // Verify host sees Player1
            await hostPage.waitForSelector('text=Player1', { timeout: 5000 });
            await expect(hostPage.locator('text=1 Players Waiting')).toBeVisible();

            // Player 2 joins
            await player2Page.goto(CLIENT_URL);
            await player2Page.click('button:has-text("JOIN GAME")');
            await player2Page.fill('input[placeholder="Game PIN"]', roomId);
            await player2Page.fill('input[placeholder="Nickname"]', 'Player2');
            await player2Page.click('button:has-text("Enter")');

            await player2Page.waitForURL(/.*\/play/, { timeout: 10000 });
            console.log('✓ Player2 joined');

            // Player 3 joins
            await player3Page.goto(CLIENT_URL);
            await player3Page.click('button:has-text("JOIN GAME")');
            await player3Page.fill('input[placeholder="Game PIN"]', roomId);
            await player3Page.fill('input[placeholder="Nickname"]', 'Player3');
            await player3Page.click('button:has-text("Enter")');

            await player3Page.waitForURL(/.*\/play/, { timeout: 10000 });
            console.log('✓ Player3 joined');

            // Verify host sees all 3 players
            await hostPage.waitForSelector('text=3 Players Waiting', { timeout: 5000 });

            // Database Checkpoint 2: Verify players added
            await new Promise(resolve => setTimeout(resolve, 1000));
            const playersAdded = await verifyPlayersAdded(roomId, 3);
            expect(playersAdded).toBe(true);

            // ==================== HOST: Start Game ====================
            console.log('\n🎮 Phase 3: Game Start and Question 1');

            await hostPage.click('button:has-text("Start Game")');

            // Verify countdown appears
            await expect(hostPage.locator('text=Get Ready!')).toBeVisible();
            console.log('✓ Countdown started');

            // Wait for first question
            await hostPage.waitForSelector('text=What is the capital of France?', { timeout: 5000 });

            // Database Checkpoint 3: Verify game started
            await new Promise(resolve => setTimeout(resolve, 1000));
            const gameStarted = await verifyGameStatus(roomId, 'STARTED');
            expect(gameStarted).toBe(true);

            // Verify players see question buttons
            await player1Page.waitForSelector('button.option-card', { timeout: 5000 });
            await player2Page.waitForSelector('button.option-card', { timeout: 5000 });
            await player3Page.waitForSelector('button.option-card', { timeout: 5000 });

            // ==================== PLAYERS: Answer Question 1 ====================
            console.log('\n📝 Phase 4: Players Answering Question 1');

            // Player1 answers correctly (Paris is option 2)
            const player1Buttons = await player1Page.locator('button.option-card').all();
            await player1Buttons[2].click(); // Answer index 2 (Paris)
            await expect(player1Page.locator('text=Answer Sent!')).toBeVisible();
            console.log('✓ Player1 answered');

            // Player2 answers incorrectly
            const player2Buttons = await player2Page.locator('button.option-card').all();
            await player2Buttons[0].click(); // Answer index 0 (London)
            await expect(player2Page.locator('text=Answer Sent!')).toBeVisible();
            console.log('✓ Player2 answered');

            // Player3 answers correctly
            const player3Buttons = await player3Page.locator('button.option-card').all();
            await player3Buttons[2].click(); // Answer index 2 (Paris)
            await expect(player3Page.locator('text=Answer Sent!')).toBeVisible();
            console.log('✓ Player3 answered');

            // Database Checkpoint 4: Verify responses recorded
            await new Promise(resolve => setTimeout(resolve, 2000));
            const responsesRecorded = await verifyResponses(roomId, 3);
            expect(responsesRecorded).toBe(true);

            // ==================== HOST: Show Results for Question 1 ====================
            console.log('\n📊 Phase 5: Show Results for Question 1');

            // Host shows results
            await hostPage.click('button:has-text("Skip")');
            await hostPage.waitForSelector('text=Next', { timeout: 5000 });

            // Verify results screen
            await expect(hostPage.locator('text=What is the capital of France?')).toBeVisible();

            // Players see results screen
            await expect(player1Page.locator("text=Time's Up!")).toBeVisible();

            // ==================== QUESTION 2 ====================
            console.log('\n📝 Phase 6: Question 2');

            // Host clicks Next
            await hostPage.click('button:has-text("Next")');

            // Wait for Question 2
            await hostPage.waitForSelector('text=Which planet is known as the Red Planet?', { timeout: 5000 });

            // Players answer Question 2
            const player1Buttons2 = await player1Page.locator('button.option-card').all();
            await player1Buttons2[0].click(); // Mars (correct)

            const player2Buttons2 = await player2Page.locator('button.option-card').all();
            await player2Buttons2[1].click(); // Venus (incorrect)

            const player3Buttons2 = await player3Page.locator('button.option-card').all();
            await player3Buttons2[0].click(); // Mars (correct)

            console.log('✓ All players answered Question 2');

            // Wait for responses to be saved
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Database Checkpoint 5: Verify all responses recorded (6 total: 3 players × 2 questions)
            const allResponsesRecorded = await verifyResponses(roomId, 6);
            expect(allResponsesRecorded).toBe(true);

            // ==================== GAME END & LEADERBOARD ====================
            console.log('\n🏆 Phase 7: Game End and Leaderboard');

            // Show results for Question 2
            await hostPage.click('button:has-text("Skip")');
            await hostPage.waitForSelector('text=Next', { timeout: 5000 });

            // Click Next to end game
            await hostPage.click('button:has-text("Next")');

            // Wait for podium/leaderboard
            await hostPage.waitForSelector('text=Podium', { timeout: 5000 });
            await expect(hostPage.locator('text=Export CSV')).toBeVisible();

            console.log('✓ Leaderboard displayed');

            // Database Checkpoint 6: Verify game finished
            await new Promise(resolve => setTimeout(resolve, 1000));
            const gameFinished = await verifyGameStatus(roomId, 'FINISHED');
            expect(gameFinished).toBe(true);

            // Players see game over
            await expect(player1Page.locator('text=Game Over')).toBeVisible();

            // ==================== CSV EXPORT ====================
            console.log('\n📥 Phase 8: CSV Export');

            // Test CSV export
            const [download] = await Promise.all([
                hostPage.waitForEvent('download'),
                hostPage.click('button:has-text("Export CSV")')
            ]);

            const filename = download.suggestedFilename();
            expect(filename).toContain(roomId);
            expect(filename).toContain('.csv');

            console.log(`✓ CSV downloaded: ${filename}`);

            // Print final session details for verification
            await printSessionDetails(roomId);

            console.log('\n✅ Full game flow completed successfully!');

        } finally {
            // Cleanup
            await hostContext.close();
            await player1Context.close();
            await player2Context.close();
            await player3Context.close();
        }
    });
});

// ============================================================================
// ADDITIONAL TEST: Duplicate Name Rejection
// ============================================================================

test.describe('Player Join Edge Cases', () => {
    test('2.4.4: Reject duplicate player names', async ({ browser, page }) => {
        console.log('\n▶ Test 2.4.4: Duplicate Name Rejection');

        // Host creates game
        const hostContext = await browser.newContext();
        const hostPage = await hostContext.newPage();

        await hostPage.goto(`${CLIENT_URL}/login`);
        await hostPage.fill('input[placeholder="Username"]', ADMIN_USERNAME);
        await hostPage.fill('input[placeholder="Password"]', ADMIN_PASSWORD);
        await hostPage.click('button[type="submit"]:has-text("Login")');
        await hostPage.waitForURL(/.*\/host/, { timeout: 10000 });

        await hostPage.click('button:has-text("Start")');
        await hostPage.waitForURL(/.*\/host\/game\/.*/, { timeout: 10000 });

        const url = hostPage.url();
        roomId = url.split('/').pop();

        // Player1 joins
        await page.goto(CLIENT_URL);
        await page.click('button:has-text("JOIN GAME")');
        await page.fill('input[placeholder="Game PIN"]', roomId);
        await page.fill('input[placeholder="Nickname"]', 'TestPlayer');
        await page.click('button:has-text("Enter")');
        await page.waitForURL(/.*\/play/, { timeout: 10000 });

        // Try to join again with same name
        const player2Context = await browser.newContext();
        const player2Page = await player2Context.newPage();

        await player2Page.goto(CLIENT_URL);
        await player2Page.click('button:has-text("JOIN GAME")');
        await player2Page.fill('input[placeholder="Game PIN"]', roomId);
        await player2Page.fill('input[placeholder="Nickname"]', 'TestPlayer'); // Same name
        await player2Page.click('button:has-text("Enter")');

        // Should show error
        await expect(player2Page.locator('text=Name taken or already joined')).toBeVisible();

        // Should NOT redirect
        await expect(player2Page).toHaveURL(/.*\/join/);

        console.log('✓ Duplicate name correctly rejected');

        await hostContext.close();
        await player2Context.close();
    });

    test('2.4.5: Reject invalid room code', async ({ page }) => {
        console.log('\n▶ Test 2.4.5: Invalid Room Code');

        await page.goto(CLIENT_URL);
        await page.click('button:has-text("JOIN GAME")');

        await page.fill('input[placeholder="Game PIN"]', 'INVALID');
        await page.fill('input[placeholder="Nickname"]', 'TestPlayer');
        await page.click('button:has-text("Enter")');

        // Should show error
        await expect(page.locator('text=Room not found')).toBeVisible();

        console.log('✓ Invalid room code correctly rejected');
    });
});
