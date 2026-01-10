import { test, expect } from "@playwright/test";
import { loadTestCredentials, TestCredentials } from "./test-utils";

/**
 * E2E Game Flow Test
 *
 * Tests the complete game flow:
 * 1. Login with saved credentials
 * 2. Join a room from the lobby
 * 3. Wait for "Waiting for next question..." state
 * 4. Wait for question to appear
 * 5. Answer the question
 * 6. Click "Leave Room"
 * 7. Verify session summary appears
 * 8. Return to lobby
 *
 * NOTE: This test requires:
 * - The game orchestrator to be running
 * - At least one room to be available
 * - The registration test to have run first (for credentials)
 */

let testCredentials: TestCredentials | null = null;

test.beforeAll(() => {
  testCredentials = loadTestCredentials();
  if (!testCredentials) {
    console.log("No test credentials found - registration test must run first");
  } else {
    console.log(`Loaded test credentials for: ${testCredentials.email}`);
  }
});

test.describe("Game Flow", () => {
  test("complete game flow: join room, answer question, leave with summary", async ({
    page,
  }) => {
    test.skip(
      !testCredentials,
      "No test credentials available - registration test must run first",
    );

    // Use longer timeout for this integration test
    test.setTimeout(180000); // 3 minutes

    const { email, password } = testCredentials!;
    console.log(`Starting game flow test with email: ${email}`);

    // ============================================
    // STEP 1: Login
    // ============================================
    console.log("Step 1: Logging in...");
    await page.goto("/");
    await expect(page).toHaveTitle(/QuizNight/i);

    // Dismiss splash screen
    const playNowButton = page.getByRole("button", { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Open auth modal
    const signInButton = page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    // Fill login form
    const authModal = page.locator('[role="dialog"]');
    await expect(authModal).toBeVisible();
    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);

    // Submit login
    const loginButton = authModal.getByRole("button", { name: /log in/i });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Wait for auth to complete
    await expect(authModal).not.toBeVisible({ timeout: 20000 });
    console.log("Login successful!");

    // ============================================
    // STEP 2: Join a room
    // ============================================
    console.log("Step 2: Joining a room...");

    // Wait for room list to load
    const quizRoomsHeading = page.getByRole("heading", { name: /quiz rooms/i });
    await expect(quizRoomsHeading).toBeVisible({ timeout: 10000 });

    // Wait for "Live" connection status
    const liveChip = page.getByText("Live");
    await expect(liveChip).toBeVisible({ timeout: 30000 });

    // Wait for at least one room to appear and click Join
    const joinButton = page.getByRole("button", { name: /^join$/i }).first();
    await expect(joinButton).toBeVisible({ timeout: 30000 });
    await expect(joinButton).toBeEnabled();
    await joinButton.click();
    console.log("Clicked Join button");

    // ============================================
    // STEP 3: Verify room loads and waiting state
    // ============================================
    console.log("Step 3: Verifying room loaded...");

    // Should navigate to /game page
    await expect(page).toHaveURL(/\/game\?roomId=/, { timeout: 10000 });

    // Should see "Waiting for next question..." or a question
    const waitingText = page.getByText("Waiting for next question...");
    const questionCard = page.locator(".space-y-6").first(); // QuestionPhase structure

    // Either we're waiting OR a question is already showing
    const isWaiting = await waitingText
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (isWaiting) {
      console.log("Room loaded - waiting for next question...");
    } else {
      console.log("Room loaded - question already showing");
    }

    // ============================================
    // STEP 4: Wait for question to appear
    // ============================================
    console.log("Step 4: Waiting for question...");

    // Look for answer options - they appear when a question is active
    // Answer buttons have letters A, B, C, D
    const answerOption = page.locator('button:has-text("A")').first();
    await expect(answerOption).toBeVisible({ timeout: 120000 }); // 2 minute wait for question
    console.log("Question appeared!");

    // ============================================
    // STEP 5: Answer the question
    // ============================================
    console.log("Step 5: Answering question...");

    // Click the first answer option (A)
    await answerOption.click();
    console.log("Clicked answer A");

    // Wait a moment for the answer to register
    await page.waitForTimeout(1000);

    // ============================================
    // STEP 6: Leave room
    // ============================================
    console.log("Step 6: Leaving room...");

    // Click "Leave Room" button
    const leaveRoomButton = page.getByRole("button", { name: /leave room/i });
    await expect(leaveRoomButton).toBeVisible({ timeout: 5000 });
    await leaveRoomButton.click();
    console.log("Clicked Leave Room");

    // ============================================
    // STEP 7: Verify session summary appears
    // ============================================
    console.log("Step 7: Verifying session summary...");

    // Session summary should appear with "Session Complete" heading
    const sessionCompleteHeading = page.getByRole("heading", {
      name: /session complete/i,
    });
    await expect(sessionCompleteHeading).toBeVisible({ timeout: 10000 });
    console.log("Session summary displayed!");

    // Verify summary contains expected elements
    const finalScoreLabel = page.getByText("Final Score");
    await expect(finalScoreLabel).toBeVisible();

    const roomRankLabel = page.getByText("Room Rank");
    await expect(roomRankLabel).toBeVisible();

    // Verify question review section
    const questionReviewHeading = page.getByRole("heading", {
      name: /question review/i,
    });
    await expect(questionReviewHeading).toBeVisible();

    // ============================================
    // STEP 8: Return to lobby
    // ============================================
    console.log("Step 8: Returning to lobby...");

    // Click "Return to Lobby" button
    const returnToLobbyButton = page.getByRole("button", {
      name: /return to lobby/i,
    });
    await expect(returnToLobbyButton).toBeVisible();
    await returnToLobbyButton.click();

    // Verify we're back at the lobby
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Verify lobby UI is visible
    await expect(quizRoomsHeading).toBeVisible({ timeout: 10000 });
    const selectRoomMessage = page.getByText("Select a room to join the quiz!");
    await expect(selectRoomMessage).toBeVisible();

    console.log("Game flow test completed successfully!");
  });

  test("can leave room without answering (no summary shown)", async ({
    page,
  }) => {
    test.skip(
      !testCredentials,
      "No test credentials available - registration test must run first",
    );

    test.setTimeout(120000); // 2 minutes

    const { email, password } = testCredentials!;

    // Quick login
    await page.goto("/");
    const playNowButton = page.getByRole("button", { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    const signInButton = page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    const authModal = page.locator('[role="dialog"]');
    await expect(authModal).toBeVisible();
    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[type="password"]').fill(password);

    const loginButton = authModal.getByRole("button", { name: /log in/i });
    await loginButton.click();
    await expect(authModal).not.toBeVisible({ timeout: 20000 });

    // Wait for rooms and join
    const liveChip = page.getByText("Live");
    await expect(liveChip).toBeVisible({ timeout: 30000 });

    const joinButton = page.getByRole("button", { name: /^join$/i }).first();
    await expect(joinButton).toBeVisible({ timeout: 30000 });
    await joinButton.click();

    // Verify we're in the game room
    await expect(page).toHaveURL(/\/game\?roomId=/, { timeout: 10000 });

    // Immediately leave without answering any questions
    const leaveRoomButton = page.getByRole("button", { name: /leave room/i });
    await expect(leaveRoomButton).toBeVisible({ timeout: 10000 });
    await leaveRoomButton.click();

    // Should redirect directly to lobby (no summary when no questions answered)
    await expect(page).toHaveURL("/", { timeout: 10000 });

    // Verify we're in the lobby
    const quizRoomsHeading = page.getByRole("heading", { name: /quiz rooms/i });
    await expect(quizRoomsHeading).toBeVisible({ timeout: 10000 });

    console.log("Leave without answering test completed successfully!");
  });
});
