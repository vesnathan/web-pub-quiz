# AppSync Resolver Development Guide

AppSync resolvers run in a restricted JavaScript runtime (APPSYNC_JS). This guide covers the constraints and patterns you must follow.

## Resolver Structure

Resolvers live in `backend/resolvers/` organized by domain:

```
backend/resolvers/
├── ably/
│   └── Queries/
│       └── Query.getAblyToken.ts
├── admin/
│   └── Queries/
│       └── Query.getWebhookLogs.ts
├── chat/
│   ├── Mutations/
│   │   ├── Mutation.sendChatMessage.ts
│   │   └── Mutation.startConversation.ts
│   └── Queries/
│       ├── Query.getChatMessages.ts
│       └── Query.getMyConversations.ts
├── users/
│   ├── Mutations/
│   │   └── Mutation.updateDisplayName.ts
│   └── Queries/
│       ├── Query.getMyProfile.ts
│       └── Query.getUserProfile.ts
└── ...
```

## Basic Resolver Template

```typescript
import { Context, util } from '@aws-appsync/utils';

export function request(ctx: Context) {
  const userId = ctx.identity?.sub;

  if (!userId) {
    return util.error('Unauthorized', 'UnauthorizedException');
  }

  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    }),
  };
}

export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
```

## Required Imports

Always use AppSync's built-in utilities:

```typescript
import { Context, util } from '@aws-appsync/utils';
```

## What's NOT Allowed

### Date/Time Operations

```typescript
// WRONG - will cause deployment failure
const now = new Date();
const timestamp = Date.now();

// CORRECT
const now = util.time.nowISO8601();
const epoch = util.time.nowEpochMilliSeconds();
```

### UUID Generation

```typescript
// WRONG - uuid package not available
import { v4 as uuid } from 'uuid';

// CORRECT
const id = util.autoId();
```

### String Constructor

```typescript
// WRONG - String() constructor not allowed
const str = String(value);

// CORRECT
const str = `${value}`;
```

### Traditional for Loops

```typescript
// WRONG - traditional for loops not allowed
for (let i = 0; i < items.length; i++) { }
for (let i = 0; i < 10; i++) { }

// CORRECT - use for...of or for...in
for (const item of items) { }
for (const key in object) { }
```

### While/Do-While Loops

```typescript
// WRONG - while loops not allowed
while (condition) { }
do { } while (condition);

// CORRECT - restructure logic or use recursion (carefully)
```

### Inline Functions in Array Methods

```typescript
// WRONG - inline arrow functions not allowed
items.map(item => item.id);
items.filter(item => item.active);
items.sort((a, b) => a.value - b.value);

// CORRECT - define named functions
function getId(item: Item): string {
  return item.id;
}
const ids = items.map(getId);
```

### Continue Statements

```typescript
// WRONG - continue not allowed
for (const item of items) {
  if (item.skip) continue;
  process(item);
}

// CORRECT - use if/else
for (const item of items) {
  if (!item.skip) {
    process(item);
  }
}
```

### External Packages

```typescript
// WRONG - npm packages not available
import lodash from 'lodash';
import axios from 'axios';

// CORRECT - use built-in utilities only
```

### Node.js Built-ins

```typescript
// WRONG - Node.js modules not available
import fs from 'fs';
import crypto from 'crypto';
import { Buffer } from 'buffer';
```

## util.error() Must Return

The `util.error()` function must be returned at the top level:

```typescript
// WRONG - util.error() in helper function
function validateInput(input: Input) {
  if (!input.name) {
    util.error('Name required', 'ValidationError'); // Won't work!
  }
}

// CORRECT - return util.error() at top level
export function request(ctx: Context) {
  if (!ctx.args.input.name) {
    return util.error('Name required', 'ValidationError');
  }
  // ...
}
```

For complex validation, return an error object from helpers:

```typescript
interface ValidationResult {
  valid: boolean;
  errorMessage?: string;
  errorType?: string;
}

function validateInput(input: Input): ValidationResult {
  if (!input.name) {
    return { valid: false, errorMessage: 'Name required', errorType: 'ValidationError' };
  }
  return { valid: true };
}

export function request(ctx: Context) {
  const validation = validateInput(ctx.args.input);
  if (!validation.valid) {
    return util.error(validation.errorMessage!, validation.errorType!);
  }
  // ...
}
```

## DynamoDB Operations

### GetItem

```typescript
return {
  operation: 'GetItem',
  key: util.dynamodb.toMapValues({
    PK: `USER#${userId}`,
    SK: 'PROFILE',
  }),
};
```

### PutItem

```typescript
return {
  operation: 'PutItem',
  key: util.dynamodb.toMapValues({
    PK: `USER#${userId}`,
    SK: 'PROFILE',
  }),
  attributeValues: util.dynamodb.toMapValues({
    displayName: ctx.args.displayName,
    updatedAt: util.time.nowISO8601(),
  }),
};
```

### Query

```typescript
return {
  operation: 'Query',
  query: {
    expression: 'PK = :pk AND begins_with(SK, :sk)',
    expressionValues: util.dynamodb.toMapValues({
      ':pk': `USER#${userId}`,
      ':sk': 'MESSAGE#',
    }),
  },
  limit: ctx.args.limit || 20,
  scanIndexForward: false,
};
```

### Query with GSI

```typescript
return {
  operation: 'Query',
  index: 'GSI1',
  query: {
    expression: 'GSI1PK = :pk',
    expressionValues: util.dynamodb.toMapValues({
      ':pk': 'LEADERBOARD#weekly',
    }),
  },
  limit: 100,
  scanIndexForward: false,
};
```

### UpdateItem

```typescript
return {
  operation: 'UpdateItem',
  key: util.dynamodb.toMapValues({
    PK: `USER#${userId}`,
    SK: 'PROFILE',
  }),
  update: {
    expression: 'SET displayName = :name, updatedAt = :now',
    expressionValues: util.dynamodb.toMapValues({
      ':name': ctx.args.displayName,
      ':now': util.time.nowISO8601(),
    }),
  },
};
```

## Lambda Data Source

For resolvers that invoke Lambda functions:

```typescript
export function request(ctx: Context) {
  return {
    operation: 'Invoke',
    payload: {
      field: ctx.info.fieldName,
      arguments: ctx.args,
      identity: ctx.identity,
    },
  };
}

export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const result = ctx.result;
  if (result.error) {
    return util.error(result.error, 'LambdaError');
  }

  return result;
}
```

## Authentication

### Cognito User Identity

```typescript
export function request(ctx: Context) {
  const userId = ctx.identity?.sub;
  const username = ctx.identity?.username;
  const groups = ctx.identity?.groups || [];

  if (!userId) {
    return util.error('Unauthorized', 'UnauthorizedException');
  }

  // Check for admin group
  const isAdmin = groups.includes('admin');

  // ...
}
```

### Public vs Authenticated

Configure in schema with directives:

```graphql
type Query {
  # Public - anyone can access
  getGameState: GameState

  # Authenticated - requires Cognito user
  getMyProfile: User @aws_cognito_user_pools
}
```

## Response Transformation

### Mapping DynamoDB Response

```typescript
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result;
  if (!item) {
    return null;
  }

  // Transform DynamoDB item to GraphQL type
  return {
    id: item.PK.replace('USER#', ''),
    displayName: item.displayName,
    createdAt: item.createdAt,
    stats: {
      gamesPlayed: item.gamesPlayed || 0,
      totalScore: item.totalScore || 0,
    },
  };
}
```

### Handling Query Results

```typescript
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];
  const nextToken = ctx.result.nextToken;

  // Transform items
  const transformedItems: Message[] = [];
  for (const item of items) {
    transformedItems.push({
      id: item.SK.replace('MESSAGE#', ''),
      content: item.content,
      createdAt: item.createdAt,
    });
  }

  return {
    items: transformedItems,
    nextToken,
  };
}
```

## Adding a New Resolver

1. **Add field to schema** in `backend/schema/00-base.graphql`:
   ```graphql
   type Query {
     myNewQuery(id: ID!): MyType @aws_cognito_user_pools
   }
   ```

2. **Create resolver file** at `backend/resolvers/domain/Queries/Query.myNewQuery.ts`

3. **Add to CloudFormation** in `deploy/resources/AppSync/appsync.yaml`:
   ```yaml
   MyNewQueryResolver:
     Type: AWS::AppSync::Resolver
     DependsOn: SchemaReadyCustomResource
     Properties:
       ApiId: !GetAtt GraphQLApi.ApiId
       TypeName: Query
       FieldName: myNewQuery
       DataSourceName: !GetAtt DynamoDBDataSource.Name
       Kind: UNIT
       Runtime:
         Name: APPSYNC_JS
         RuntimeVersion: "1.0.0"
       CodeS3Location: !Sub "s3://${TemplateBucketName}/resolvers/${Stage}/${ResolversBuildHash}/domain/Queries/Query.myNewQuery.js"
   ```

4. **Deploy**:
   ```bash
   yarn workspace @quiz/deploy deploy:prod
   ```

## Resolver Compilation

The resolver compiler (`deploy/utils/resolver-compiler.ts`):

1. Transforms TypeScript to JavaScript
2. Inlines helper functions (no separate imports)
3. Validates against AppSync's evaluate-code API
4. Reports errors with line numbers

### Validation Errors

If a resolver fails validation:

```
[ERROR] Resolver validation failed: Query.myNewQuery
  Line 15: 'for' loops are not supported. Use 'for...of' or 'for...in' instead.
```

Fix the issue and re-deploy.

## Common Patterns

### Conditional Updates

```typescript
export function request(ctx: Context) {
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `USER#${ctx.identity?.sub}`,
      SK: 'PROFILE',
    }),
    update: {
      expression: 'SET displayName = :name',
      expressionValues: util.dynamodb.toMapValues({
        ':name': ctx.args.displayName,
      }),
    },
    condition: {
      expression: 'attribute_exists(PK)',
    },
  };
}
```

### Batch Get

```typescript
export function request(ctx: Context) {
  const keys: Record<string, unknown>[] = [];
  for (const id of ctx.args.ids) {
    keys.push({
      PK: `USER#${id}`,
      SK: 'PROFILE',
    });
  }

  return {
    operation: 'BatchGetItem',
    tables: {
      '${tableName}': {
        keys: keys.map(k => util.dynamodb.toMapValues(k)),
      },
    },
  };
}
```

### Transaction

```typescript
export function request(ctx: Context) {
  return {
    operation: 'TransactWriteItems',
    transactItems: [
      {
        table: '${tableName}',
        operation: 'PutItem',
        key: util.dynamodb.toMapValues({ PK: 'KEY1', SK: 'SK1' }),
        attributeValues: util.dynamodb.toMapValues({ value: 'a' }),
      },
      {
        table: '${tableName}',
        operation: 'UpdateItem',
        key: util.dynamodb.toMapValues({ PK: 'KEY2', SK: 'SK2' }),
        update: {
          expression: 'SET counter = counter + :inc',
          expressionValues: util.dynamodb.toMapValues({ ':inc': 1 }),
        },
      },
    ],
  };
}
```
