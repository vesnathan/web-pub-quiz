# GraphQL Schema Guide

This document describes the GraphQL schema structure, conventions, and how to make schema changes.

## Schema Files

The schema is split across multiple files in `backend/schema/`:

```
backend/schema/
├── 00-base.graphql      # Query, Mutation, Subscription roots
├── Admin.graphql        # Admin-only types
├── Badge.graphql        # Badge/achievement types
├── Chat.graphql         # Chat/messaging types
└── User.graphql         # User profile types
```

Files are merged alphabetically. The `00-` prefix ensures base types are processed first.

## Schema Merging

The deploy script merges all `.graphql` files into a single schema:

```
backend/combined_schema.graphql
```

This combined file is uploaded to S3 and used by AppSync.

## Important: No extend type

**AppSync does NOT reliably support `extend type Query` in merged schemas.**

```graphql
# WRONG - will be silently ignored
# In Admin.graphql
extend type Query {
  getAdminData: AdminData
}

# CORRECT - add to 00-base.graphql
# In 00-base.graphql
type Query {
  # ... existing queries ...

  # Admin queries
  getAdminData: AdminData @aws_cognito_user_pools
}
```

Always define Query, Mutation, and Subscription fields in `00-base.graphql`.

## Type Definitions

Types can be defined in any schema file. They'll be merged correctly:

```graphql
# In Badge.graphql
type Badge {
  id: ID!
  name: String!
  description: String!
  icon: String!
}

# In User.graphql
type User {
  id: ID!
  displayName: String!
  badges: [Badge!]!  # References Badge type from another file
}
```

## Authentication Directives

### @aws_cognito_user_pools

Requires authenticated Cognito user:

```graphql
type Query {
  getMyProfile: User @aws_cognito_user_pools
}
```

### @aws_iam

Allows IAM authentication (for service-to-service calls):

```graphql
type Mutation {
  internalUpdate(data: String!): Boolean @aws_iam
}
```

### No directive = public

Fields without auth directives are publicly accessible:

```graphql
type Query {
  getGameState: GameState  # Anyone can call this
}
```

## Subscription Directive

For real-time subscriptions:

```graphql
type Subscription {
  onNewChatMessage(channelId: ID!): ChatMessage
    @aws_subscribe(mutations: ["sendChatMessage"])
    @aws_cognito_user_pools
}
```

The `@aws_subscribe` directive links the subscription to mutations that trigger it.

## Common Patterns

### Pagination

Use connection pattern for paginated results:

```graphql
type MessageConnection {
  items: [Message!]!
  nextToken: String
}

type Query {
  getChatMessages(
    channelId: ID!
    limit: Int
    nextToken: String
  ): MessageConnection @aws_cognito_user_pools
}
```

### Input Types

Use input types for complex mutations:

```graphql
input CreateQuestionInput {
  question: String!
  options: [String!]!
  correctAnswer: Int!
  category: String!
  difficulty: Difficulty!
}

type Mutation {
  createQuestion(input: CreateQuestionInput!): Question @aws_cognito_user_pools
}
```

### Enums

Define enums for constrained values:

```graphql
enum Difficulty {
  easy
  medium
  hard
}

enum LeaderboardType {
  daily
  weekly
  allTime
}
```

### Non-null Types

Use `!` for required fields:

```graphql
type User {
  id: ID!              # Always present
  displayName: String! # Always present
  bio: String          # Optional, can be null
  badges: [Badge!]!    # List always exists, items never null
  friends: [User!]     # List can be null, but items never null if present
}
```

## Adding a New Type

1. **Create or update schema file**:

   ```graphql
   # In backend/schema/NewFeature.graphql
   type NewFeature {
     id: ID!
     name: String!
     createdAt: String!
   }

   type NewFeatureConnection {
     items: [NewFeature!]!
     nextToken: String
   }
   ```

2. **Add query/mutation to 00-base.graphql**:

   ```graphql
   type Query {
     # ... existing ...

     # New feature queries
     getNewFeature(id: ID!): NewFeature @aws_cognito_user_pools
     listNewFeatures(limit: Int, nextToken: String): NewFeatureConnection
   }

   type Mutation {
     # ... existing ...

     # New feature mutations
     createNewFeature(name: String!): NewFeature @aws_cognito_user_pools
   }
   ```

3. **Create resolvers** (see APPSYNC_RESOLVERS.md)

4. **Add to CloudFormation** (see DEPLOYMENT.md)

5. **Deploy**:
   ```bash
   yarn workspace @quiz/deploy deploy:prod
   ```

## Checking Schema Validity

Before deploying, you can validate the merged schema:

```bash
# Merge schema locally
cd deploy && npx tsx -e "
  const fs = require('fs');
  const path = require('path');
  const schemaDir = '../backend/schema';
  const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.graphql')).sort();
  let merged = '';
  for (const file of files) {
    merged += fs.readFileSync(path.join(schemaDir, file), 'utf-8') + '\n';
  }
  console.log(merged);
" > /tmp/schema.graphql

# Check for issues
cat /tmp/schema.graphql | grep -E "extend type (Query|Mutation|Subscription)"
# Should return nothing - extend type is not allowed
```

## Current Schema Structure

### Query Fields

| Field | Auth | Description |
|-------|------|-------------|
| `getMyProfile` | Cognito | Get current user's profile |
| `getUserProfile(userId)` | Public | Get any user's public profile |
| `checkDisplayNameAvailable(displayName)` | Public | Check if name is taken |
| `checkEmailHasGoogleAccount(email)` | Public | Check if email uses Google auth |
| `getLeaderboard(type, limit)` | Public | Get leaderboard entries |
| `getMyRank(type)` | Cognito | Get current user's rank |
| `getGameState` | Public | Get current game state |
| `listQuestions(limit, nextToken)` | Cognito | List questions (admin) |
| `getAblyToken` | Cognito | Get Ably auth token |
| `getChatMessages(channelId, limit, nextToken)` | Cognito | Get chat messages |
| `getMyConversations(limit)` | Cognito | Get user's conversations |
| `getWebhookLogs(provider, limit, nextToken)` | Cognito | Get webhook logs (admin) |

### Mutation Fields

| Field | Auth | Description |
|-------|------|-------------|
| `updateDisplayName(displayName)` | Cognito | Update display name |
| `ensureProfile(displayName)` | Cognito | Create profile if not exists |
| `createCheckoutSession(input)` | Cognito | Create payment checkout |
| `createTipCheckout(provider)` | Cognito | Create tip jar checkout |
| `createQuestion(input)` | Cognito | Create question (admin) |
| `seedQuestions(questions)` | Cognito | Bulk create questions (admin) |
| `sendChatMessage(channelId, content)` | Cognito | Send chat message |
| `startConversation(targetUserId)` | Cognito | Start DM conversation |

### Subscription Fields

| Field | Auth | Triggered By |
|-------|------|--------------|
| `onNewChatMessage(channelId)` | Cognito | `sendChatMessage` |

## Type Reference

See `shared/src/types/gqlTypes.ts` for TypeScript types generated from the schema.

**Note**: `gqlTypes.ts` is auto-generated by codegen. Don't edit manually.
