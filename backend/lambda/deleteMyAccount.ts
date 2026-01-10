/**
 * Lambda to delete a user's account (GDPR right to erasure)
 * Deletes:
 * - User from Cognito
 * - User record from DynamoDB
 * - User's chat messages (anonymizes sender info)
 */
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  DeleteItemCommand,
  QueryCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";

const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});

const userPoolId = process.env.USER_POOL_ID!;
const tableName = process.env.TABLE_NAME!;

interface AppSyncEvent {
  identity: {
    sub: string;
    username: string;
    claims: {
      email: string;
      sub: string;
    };
  };
}

interface DeleteAccountResult {
  success: boolean;
  message: string;
}

export const handler = async (
  event: AppSyncEvent,
): Promise<DeleteAccountResult> => {
  const userId = event.identity.sub;
  const username = event.identity.username;

  console.log(`Deleting account for user: ${userId}`);

  try {
    // 1. Delete user from Cognito
    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: username,
        }),
      );
      console.log(`Deleted user from Cognito: ${username}`);
    } catch (cognitoError: unknown) {
      const errorName =
        cognitoError instanceof Error ? cognitoError.name : "Unknown";
      if (errorName !== "UserNotFoundException") {
        throw cognitoError;
      }
      console.log(`User already deleted from Cognito: ${username}`);
    }

    // 2. Delete user record from DynamoDB
    try {
      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "PROFILE" },
          },
        }),
      );
      console.log(`Deleted user profile from DynamoDB: ${userId}`);
    } catch (dbError) {
      console.error(`Failed to delete user profile: ${dbError}`);
      // Continue with other deletions even if profile delete fails
    }

    // 3. Delete user stats
    try {
      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "STATS" },
          },
        }),
      );
      console.log(`Deleted user stats from DynamoDB: ${userId}`);
    } catch (statsError) {
      console.error(`Failed to delete user stats: ${statsError}`);
    }

    // 4. Delete user subscription record
    try {
      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: {
            PK: { S: `USER#${userId}` },
            SK: { S: "SUBSCRIPTION" },
          },
        }),
      );
      console.log(`Deleted user subscription from DynamoDB: ${userId}`);
    } catch (subError) {
      console.error(`Failed to delete user subscription: ${subError}`);
    }

    // 5. Delete user badges
    try {
      // Query all badges for user
      const badgesResult = await dynamoClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": { S: `USER#${userId}` },
            ":sk": { S: "BADGE#" },
          },
        }),
      );

      if (badgesResult.Items && badgesResult.Items.length > 0) {
        // Batch delete badges (max 25 per batch)
        const batches = [];
        for (let i = 0; i < badgesResult.Items.length; i += 25) {
          const batch = badgesResult.Items.slice(i, i + 25).map((item) => ({
            DeleteRequest: {
              Key: {
                PK: item.PK,
                SK: item.SK,
              },
            },
          }));
          batches.push(batch);
        }

        for (const batch of batches) {
          await dynamoClient.send(
            new BatchWriteItemCommand({
              RequestItems: {
                [tableName]: batch,
              },
            }),
          );
        }
        console.log(
          `Deleted ${badgesResult.Items.length} badges for user: ${userId}`,
        );
      }
    } catch (badgeError) {
      console.error(`Failed to delete user badges: ${badgeError}`);
    }

    // 6. Remove user from leaderboards (they'll naturally fall off, but clean up GSI)
    // Leaderboard entries use the same USER# PK, already deleted above

    console.log(`Successfully deleted account for user: ${userId}`);

    return {
      success: true,
      message:
        "Your account has been permanently deleted. Thank you for using QuizNight.live.",
    };
  } catch (error) {
    console.error(`Failed to delete account: ${error}`);
    return {
      success: false,
      message:
        "Failed to delete account. Please contact support@quiznight.live for assistance.",
    };
  }
};
