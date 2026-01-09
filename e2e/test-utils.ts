import * as fs from "fs";
import * as path from "path";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const CREDENTIALS_FILE = path.join(__dirname, ".test-credentials.json");
const USER_POOL_ID = process.env.USER_POOL_ID || "ap-southeast-2_FkwNITs8W";
const REGION = process.env.AWS_REGION || "ap-southeast-2";

export interface TestCredentials {
  email: string;
  password: string;
  screenName: string;
  createdAt: string;
}

/**
 * Save test credentials for use by subsequent tests
 */
export function saveTestCredentials(credentials: TestCredentials): void {
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  console.log(`Saved test credentials for: ${credentials.email}`);
}

/**
 * Load test credentials saved by a previous test
 */
export function loadTestCredentials(): TestCredentials | null {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch {
    console.log("No saved test credentials found");
  }
  return null;
}

/**
 * Delete the test user from Cognito
 */
export async function deleteTestUser(email: string): Promise<void> {
  const client = new CognitoIdentityProviderClient({ region: REGION });

  try {
    await client.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
      }),
    );
    console.log(`Deleted test user: ${email}`);
  } catch (error: unknown) {
    const errorName = error instanceof Error ? error.name : "";
    if (errorName === "UserNotFoundException") {
      console.log(`Test user not found (already deleted): ${email}`);
    } else {
      console.error(`Failed to delete test user: ${email}`, error);
    }
  }
}

/**
 * Clean up test credentials file
 */
export function cleanupCredentialsFile(): void {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
      console.log("Cleaned up test credentials file");
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Generate unique test email for each run
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test+e2e-${timestamp}-${random}@quiznight.live`;
}

/**
 * Sanitize email for SSM parameter name
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/\+/g, "-plus-")
    .replace(/@/g, "-at-")
    .replace(/\./g, "-");
}
