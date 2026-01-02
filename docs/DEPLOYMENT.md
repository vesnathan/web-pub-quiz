# Quiz Night Live - Deployment Architecture

This document describes the deployment architecture for Quiz Night Live. The goal is a reproducible, CloudFormation-driven deployment that can be run from a fresh clone.

## Quick Start

```bash
# From project root
yarn install
yarn workspace @quiz/deploy deploy:prod
```

This single command deploys everything: infrastructure, backend, and frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Deploy Script                             │
│                     (deploy/deploy.ts)                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Compile TypeScript (resolvers, lambdas)                     │
│  2. Upload artifacts to S3 with content hashes                  │
│  3. Deploy CloudFormation stack                                 │
│  4. Post-deploy: Update Lambdas, build frontend, push to S3    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFormation Stack                          │
│                  (quiz-night-live-prod)                         │
├─────────────────────────────────────────────────────────────────┤
│  Main Template: deploy/cfn-template.yaml                        │
│                                                                  │
│  Nested Stacks:                                                 │
│  ├── DynamoDbStack   → DynamoDB single-table                   │
│  ├── S3Stack         → Frontend bucket                         │
│  ├── CognitoStack    → User authentication                     │
│  ├── CloudFrontStack → CDN distribution                        │
│  ├── LambdaStack     → Lambda functions                        │
│  ├── AppSyncStack    → GraphQL API + resolvers                 │
│  └── FargateStack    → ECS orchestrator service                │
└─────────────────────────────────────────────────────────────────┘
```

## Versioning Strategy

All deployable artifacts use content-based hashing to ensure CloudFormation detects changes:

| Artifact | Hash Parameter | S3 Path Pattern |
|----------|---------------|-----------------|
| Nested Templates | `TemplateBuildHash` | `resources/{hash}/Lambda/lambda.yaml` |
| GraphQL Schema | `SchemaBuildHash` | `schema/prod/{hash}/schema.graphql` |
| Resolvers | `ResolversBuildHash` | `resolvers/prod/{hash}/users/Query.getMyProfile.js` |
| Lambdas | (by function name) | `functions/prod/getAblyToken.zip` |

### Why Hashing Matters

CloudFormation only detects changes when resource properties change. If an S3 key stays the same but content changes, CloudFormation won't notice. By including content hashes in paths:

1. New content → new hash → new S3 key → CloudFormation updates the resource
2. Same content → same hash → no unnecessary updates

## Deploy Script Phases

### Phase 1: Certificate Stack (us-east-1)

ACM certificates for CloudFront must be in us-east-1. A separate stack handles this:

```
deploy/resources/Certificate/certificate.yaml
```

### Phase 2: Merge and Upload Schema

Schema files in `backend/schema/*.graphql` are merged into a single file:

```
backend/schema/
├── 00-base.graphql      # Query, Mutation, Subscription roots
├── Admin.graphql        # Admin types
├── Badge.graphql        # Badge types
├── Chat.graphql         # Chat types
└── User.graphql         # User types
```

**Important**: All Query/Mutation fields must be in the root type definitions (in `00-base.graphql`). AppSync does not reliably support `extend type Query` across merged schemas.

### Phase 3: Upload Templates

All nested stack templates are uploaded to S3 with the template hash:

```
s3://quiz-night-live-deploy-templates/
├── cfn-template.yaml                              # Main template
├── resources/{hash}/
│   ├── AppSync/appsync.yaml
│   ├── Cognito/cognito.yaml
│   ├── DynamoDb/dynamoDb.yaml
│   ├── Lambda/lambda.yaml
│   └── ...
```

### Phase 4: Compile and Upload Lambdas

Lambda functions in `backend/lambda/*.ts` are:
1. Compiled with esbuild (bundled, minified)
2. Zipped
3. Uploaded to S3

```
s3://quiz-night-live-deploy-templates/functions/prod/
├── getAblyToken.zip
├── createCheckout.zip
├── stripeWebhook.zip
└── ...
```

### Phase 5: Compile and Upload Resolvers

AppSync resolvers in `backend/resolvers/` are:
1. Compiled with the custom resolver compiler
2. Validated against AppSync's evaluate-code API
3. Uploaded to S3

```
s3://quiz-night-live-deploy-templates/resolvers/prod/{hash}/
├── users/Queries/Query.getMyProfile.js
├── users/Mutations/Mutation.updateDisplayName.js
└── ...
```

### Phase 6: CloudFormation Deploy

The main stack is deployed/updated with all hash parameters:

```bash
aws cloudformation update-stack \
  --stack-name quiz-night-live-prod \
  --template-url s3://bucket/cfn-template.yaml \
  --parameters \
    ParameterKey=TemplateBuildHash,ParameterValue={hash} \
    ParameterKey=SchemaBuildHash,ParameterValue={hash} \
    ParameterKey=ResolversBuildHash,ParameterValue={hash} \
    ...
```

### Phase 7: Post-Deploy Updates

After CloudFormation completes:

1. **Lambda Code Update**: CloudFormation doesn't detect S3 content changes for Lambda code, so we call `UpdateFunctionCode` directly
2. **Docker Build**: Build and push the orchestrator container to ECR
3. **ECS Update**: Force new deployment of the orchestrator service
4. **Frontend Build**: Build Next.js and sync to S3
5. **CloudFront Invalidation**: Invalidate the CDN cache

## CloudFormation Stack Structure

### Main Template Parameters

| Parameter | Description |
|-----------|-------------|
| `Stage` | Deployment stage (dev, prod) |
| `AppName` | Application name prefix |
| `TemplateBucketName` | S3 bucket for templates |
| `TemplateBuildHash` | Hash for nested template versioning |
| `SchemaBuildHash` | Hash for schema versioning |
| `ResolversBuildHash` | Hash for resolver versioning |
| `AblyApiKey` | Ably real-time API key |
| `DomainName` | Custom domain (prod only) |
| `CertificateArn` | ACM certificate ARN |

### Nested Stack Dependencies

```
DynamoDbStack
     │
     ├──► S3Stack
     │
     ├──► CognitoStack ──► CloudFrontStack
     │         │
     │         ▼
     └──► LambdaStack
              │
              ▼
         AppSyncStack ◄── SchemaReadyCustomResource
              │
              ▼
         FargateStack
```

### Schema Ready Custom Resource

A critical component that solves a race condition:

**Problem**: When adding new resolvers that reference new schema fields, CloudFormation may create resolvers before the schema update completes, causing "No field named X" errors.

**Solution**: A Lambda-backed custom resource that:
1. Depends on `GraphQLSchema`
2. Waits for schema to reach `SUCCESS` status
3. All resolvers depend on this custom resource

```yaml
SchemaReadyCustomResource:
  Type: Custom::SchemaReady
  DependsOn: GraphQLSchema
  Properties:
    ServiceToken: !Ref SchemaReadyWaiterFunctionArn
    ApiId: !GetAtt GraphQLApi.ApiId
    SchemaHash: !Ref SchemaBuildHash
```

## IAM Roles

### Deploy User

A dedicated IAM user with limited permissions for CI/CD:

```
arn:aws:iam::ACCOUNT:user/quiz-night-live-deploy
```

Policy: `deploy/iam-policies/quiz-night-live-deploy-policy.json`

### CloudFormation Role

CloudFormation assumes this role to create/update resources:

```
arn:aws:iam::ACCOUNT:role/quiz-night-live-cfn-role
```

This separation allows the deploy user to have minimal permissions while CloudFormation has full access to create resources.

### Seed Role

For post-deploy operations (Lambda updates, ECR push, S3 sync):

```
arn:aws:iam::ACCOUNT:role/quiz-night-live-seed-role-prod
```

## Environment Variables

Required in `.env` file:

```bash
# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-southeast-2

# Deployment
DEPLOY_USER_ARN=arn:aws:iam::ACCOUNT:user/quiz-night-live-deploy

# Domain (prod only)
DOMAIN_NAME=quiznight.live
HOSTED_ZONE_ID=xxx
CERTIFICATE_ARN=arn:aws:acm:us-east-1:ACCOUNT:certificate/xxx
AUTH_DOMAIN_CERTIFICATE_ARN=arn:aws:acm:us-east-1:ACCOUNT:certificate/xxx

# Third-party
ABLY_API_KEY=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

## Troubleshooting

### "No field named X found on type Query"

**Cause**: Resolver created before schema update completed.

**Fix**:
1. Ensure the field is in `00-base.graphql` (not using `extend type Query`)
2. Ensure `SchemaReadyWaiterFunction` exists and resolvers depend on `SchemaReadyCustomResource`

### CloudFormation Rollback

**Cause**: Any resource creation/update failure triggers rollback.

**Debug**:
```bash
# Check parent stack events
aws cloudformation describe-stack-events --stack-name quiz-night-live-prod

# Check nested stack events
aws cloudformation describe-stack-events --stack-name quiz-night-live-prod-AppSyncStack-XXX
```

### Lambda Code Not Updated

**Cause**: CloudFormation doesn't detect S3 content changes.

**Fix**: The deploy script calls `UpdateFunctionCode` directly after CloudFormation completes. Check the "Updating Lambda function code" section of deploy logs.

### Schema Changes Not Applied

**Cause**: CloudFormation caches S3 content if the key doesn't change.

**Fix**: Schema is now uploaded with content hash in path. Verify:
```bash
aws s3 ls s3://quiz-night-live-deploy-templates/schema/prod/
```

## Fresh Deployment

To deploy from scratch:

1. **Delete existing stack** (if any):
   ```bash
   aws cloudformation delete-stack --stack-name quiz-night-live-prod
   aws cloudformation wait stack-delete-complete --stack-name quiz-night-live-prod
   ```

2. **Ensure bootstrap resources exist**:
   - S3 bucket: `quiz-night-live-deploy-templates`
   - IAM roles: cfn-role, seed-role

3. **Run deployment**:
   ```bash
   yarn workspace @quiz/deploy deploy:prod
   ```

4. **Verify**:
   - CloudFormation stack status: `CREATE_COMPLETE`
   - AppSync API accessible
   - Frontend loads at CloudFront URL

## File Structure

```
deploy/
├── deploy.ts                    # Main deploy script
├── cfn-template.yaml           # Main CloudFormation template
├── bootstrap-check.ts          # Verify bootstrap resources
├── resources/
│   ├── AppSync/appsync.yaml    # GraphQL API, resolvers
│   ├── Certificate/            # ACM certificates
│   ├── CloudFront/             # CDN distribution
│   ├── Cognito/                # User authentication
│   ├── DynamoDb/               # Database
│   ├── Fargate/                # ECS orchestrator
│   ├── Lambda/lambda.yaml      # Lambda functions
│   └── S3/                     # Storage buckets
├── utils/
│   └── resolver-compiler.ts    # AppSync resolver compiler
└── iam-policies/
    └── quiz-night-live-deploy-policy.json
```

## Logs

Deploy logs are written to:
```
.cache/logs/deploy-quiz-prod-full-{timestamp}.log
```

Old logs are automatically cleaned up (keeps last 5).
