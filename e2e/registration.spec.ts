import { test, expect } from '@playwright/test';
import {
  SSMClient,
  GetParameterCommand,
  DeleteParameterCommand,
} from '@aws-sdk/client-ssm';

/**
 * E2E Registration Test
 *
 * Tests the full native registration flow:
 * 1. Open auth modal
 * 2. Fill registration form
 * 3. Submit and wait for confirmation screen
 * 4. Fetch verification code from SSM
 * 5. Enter code and confirm
 * 6. Verify user lands on lobby
 *
 * Prerequisites:
 * - AWS credentials with SSM read/delete access for /quiz/prod/e2e/codes/*
 * - CustomMessage Lambda deployed to capture verification codes
 */

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const STAGE = process.env.STAGE || 'prod';

const ssmClient = new SSMClient({ region: REGION });

// Generate unique test email for each run
function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test+e2e-${timestamp}-${random}@quiznight.live`;
}

// Sanitize email for SSM parameter name
function sanitizeEmail(email: string): string {
  return email.toLowerCase().replace(/@/g, '-at-').replace(/\./g, '-');
}

// Fetch and delete verification code from SSM with retries
async function getVerificationCode(
  email: string,
  maxRetries: number = 15,
  retryDelayMs: number = 2000
): Promise<string> {
  const sanitizedEmail = sanitizeEmail(email);
  const paramName = `/quiz/${STAGE}/e2e/codes/${sanitizedEmail}/CustomMessage_SignUp`;

  console.log(`Looking for verification code at: ${paramName}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ssmClient.send(
        new GetParameterCommand({
          Name: paramName,
          WithDecryption: true,
        })
      );

      if (response.Parameter?.Value) {
        const data = JSON.parse(response.Parameter.Value);
        console.log(`Found verification code for ${email} (attempt ${attempt})`);

        // Delete the parameter immediately after retrieval
        try {
          await ssmClient.send(new DeleteParameterCommand({ Name: paramName }));
          console.log(`Deleted verification code from SSM`);
        } catch {
          console.warn('Warning: Failed to delete code from SSM');
        }

        return data.code;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('ParameterNotFound')) {
        if (attempt < maxRetries) {
          console.log(
            `Code not found yet (attempt ${attempt}/${maxRetries}), waiting ${retryDelayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Verification code not found after ${maxRetries} attempts`);
}

test.describe('Registration Flow', () => {
  test('complete native registration with email verification', async ({ page }) => {
    // Generate unique test data
    const testEmail = generateTestEmail();
    const testPassword = 'TestPass123!';
    const testFirstName = 'E2E';
    const testLastName = 'TestUser';
    const testScreenName = `e2e_${Date.now()}`;

    console.log(`Testing registration with email: ${testEmail}`);

    // Step 1: Navigate to homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/Quiz Night/i);

    // Step 2: Wait for splash screen to load and click Play Now
    const playNowButton = page.getByRole('button', { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Step 3: Click Sign In button to open auth modal
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    // Step 3: Wait for auth modal and switch to Register tab
    const authModal = page.locator('[role="dialog"]');
    await expect(authModal).toBeVisible();

    const registerTab = page.getByRole('tab', { name: /register/i });
    await registerTab.click();

    // Step 4: Fill in registration form
    // Wait for form to be visible
    await expect(page.getByLabel(/first name/i)).toBeVisible();

    // Fill in all fields
    await page.getByLabel(/first name/i).fill(testFirstName);
    await page.getByLabel(/last name/i).fill(testLastName);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/screen name/i).fill(testScreenName);

    // Password fields (there are two, so we need to be specific)
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().fill(testPassword);
    await passwordFields.last().fill(testPassword);

    // Wait for screen name availability check
    await page.waitForTimeout(1500);

    // Step 5: Submit registration
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await expect(createAccountButton).toBeEnabled({ timeout: 10000 });
    await createAccountButton.click();

    // Step 6: Wait for confirmation code screen
    await expect(page.getByText(/confirmation code/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(testEmail)).toBeVisible();

    console.log('Registration submitted, waiting for verification code...');

    // Step 7: Fetch verification code from SSM
    const verificationCode = await getVerificationCode(testEmail);
    console.log(`Retrieved verification code: ${verificationCode}`);

    // Step 8: Enter verification code
    const codeInput = page.getByLabel(/confirmation code/i);
    await codeInput.fill(verificationCode);

    // Step 9: Click Confirm button
    const confirmButton = page.getByRole('button', { name: /^confirm$/i });
    await confirmButton.click();

    // Step 10: Verify user lands on lobby (auth modal closes, user is logged in)
    // The modal should close and user should see lobby content
    await expect(authModal).not.toBeVisible({ timeout: 15000 });

    // Check for lobby indicators - user should see their screen name or lobby elements
    // Wait for the page to fully load after auth
    await page.waitForTimeout(2000);

    // User should now be authenticated - check for user menu or lobby content
    const userIndicator = page.locator(`text=${testScreenName}`).or(
      page.getByRole('button', { name: /rooms/i })
    ).or(
      page.locator('text=/welcome/i')
    );
    await expect(userIndicator.first()).toBeVisible({ timeout: 10000 });

    console.log('Registration flow completed successfully!');
  });

  test('shows validation errors for invalid input', async ({ page }) => {
    await page.goto('/');

    // Dismiss splash screen
    const playNowButton = page.getByRole('button', { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Open auth modal and switch to register
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    const registerTab = page.getByRole('tab', { name: /register/i });
    await registerTab.click();

    // Wait for form
    await expect(page.getByLabel(/first name/i)).toBeVisible();

    // Fill in mismatched passwords
    await page.getByLabel(/first name/i).fill('Test');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/screen name/i).fill('testuser123');

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().fill('TestPass123!');
    await passwordFields.last().fill('DifferentPass456!');

    // Check for password mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();

    // Create Account button should be disabled
    const createAccountButton = page.getByRole('button', { name: /create account/i });
    await expect(createAccountButton).toBeDisabled();
  });

  test('shows password strength requirements', async ({ page }) => {
    await page.goto('/');

    // Dismiss splash screen
    const playNowButton = page.getByRole('button', { name: /play now/i });
    await expect(playNowButton).toBeVisible({ timeout: 15000 });
    await playNowButton.click();

    // Open auth modal and switch to register
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible({ timeout: 10000 });
    await signInButton.click();

    const registerTab = page.getByRole('tab', { name: /register/i });
    await registerTab.click();

    await expect(page.getByLabel(/first name/i)).toBeVisible();

    // Enter a weak password
    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.first().fill('weak');

    // Should show password strength indicator
    await expect(page.getByText(/8 characters/i).or(page.getByText(/uppercase/i))).toBeVisible();
  });
});
