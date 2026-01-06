import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

// ============================================================================
// Configuration
// ============================================================================

const EMAIL_TO_DELETE = 'vesnathan@gmail.com';
const TABLE_NAME = process.env.TABLE_NAME || 'quiz-night-live-datatable-prod';
const USER_POOL_ID = process.env.USER_POOL_ID || 'ap-southeast-2_FkwNITs8W';
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION });

// ============================================================================
// Find User in Cognito by Email
// ============================================================================

async function findCognitoUserByEmail(email: string): Promise<{ username: string; sub: string } | null> {
  console.log(`\n🔍 Looking up user in Cognito: ${email}`);

  if (!USER_POOL_ID) {
    console.error('❌ USER_POOL_ID environment variable is required');
    process.exit(1);
  }

  const result = await cognitoClient.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    })
  );

  if (!result.Users || result.Users.length === 0) {
    console.log('  User not found in Cognito');
    return null;
  }

  const user = result.Users[0];
  const sub = user.Attributes?.find((attr) => attr.Name === 'sub')?.Value;

  if (!sub) {
    console.error('  User found but no sub attribute');
    return null;
  }

  console.log(`  Found user: ${user.Username} (sub: ${sub})`);
  return { username: user.Username!, sub };
}

// ============================================================================
// Delete User from Cognito
// ============================================================================

async function deleteFromCognito(username: string): Promise<boolean> {
  console.log(`\n🗑️  Deleting user from Cognito: ${username}`);

  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
    console.log('  ✅ Deleted from Cognito');
    return true;
  } catch (error) {
    console.error('  ❌ Failed to delete from Cognito:', error);
    return false;
  }
}

// ============================================================================
// Find and Delete User from DynamoDB
// ============================================================================

async function deleteFromDynamoDB(userId: string): Promise<boolean> {
  console.log(`\n🗑️  Deleting user from DynamoDB: USER#${userId}`);

  try {
    // First, query to find all items with this user's PK
    const queryResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
        },
      })
    );

    const items = queryResult.Items || [];
    console.log(`  Found ${items.length} item(s) to delete`);

    if (items.length === 0) {
      console.log('  No items found in DynamoDB');
      return true;
    }

    // Delete each item
    for (const item of items) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        })
      );
      console.log(`  Deleted: PK=${item.PK}, SK=${item.SK}`);
    }

    console.log('  ✅ Deleted from DynamoDB');
    return true;
  } catch (error) {
    console.error('  ❌ Failed to delete from DynamoDB:', error);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('============================================================');
  console.log('DELETE USER SCRIPT');
  console.log(`Email: ${EMAIL_TO_DELETE}`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`User Pool: ${USER_POOL_ID || '(not set)'}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log('============================================================');

  // Step 1: Find user in Cognito
  const cognitoUser = await findCognitoUserByEmail(EMAIL_TO_DELETE);

  if (!cognitoUser) {
    console.log('\n⚠️  User not found in Cognito. Will attempt DynamoDB cleanup by email lookup...');
    // Could query GSI for email, but for now we'll exit
    console.log('❌ Cannot proceed without Cognito user ID');
    process.exit(1);
  }

  // Step 2: Delete from DynamoDB first (in case Cognito delete fails, we still have the user)
  const ddbSuccess = await deleteFromDynamoDB(cognitoUser.sub);

  // Step 3: Delete from Cognito
  const cognitoSuccess = await deleteFromCognito(cognitoUser.username);

  // Summary
  console.log('\n============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`DynamoDB: ${ddbSuccess ? '✅ Deleted' : '❌ Failed'}`);
  console.log(`Cognito:  ${cognitoSuccess ? '✅ Deleted' : '❌ Failed'}`);

  if (ddbSuccess && cognitoSuccess) {
    console.log('\n✅ User fully deleted!');
  } else {
    console.log('\n⚠️  Partial deletion - check errors above');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
