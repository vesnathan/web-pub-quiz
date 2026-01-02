# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json yarn.lock ./
COPY shared/package.json shared/
COPY backend/package.json backend/

# Install all dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY shared/ shared/
COPY backend/ backend/

# Build the orchestrator
WORKDIR /app/backend
RUN node scripts/build.js

# Production stage
FROM node:20-alpine AS runner

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy built orchestrator (esbuild bundles all deps except @aws-sdk/*)
COPY --from=builder /app/backend/dist/orchestrator ./dist

# Install only the external AWS SDK dependencies
RUN npm init -y && npm install --no-save \
    @aws-sdk/client-dynamodb \
    @aws-sdk/lib-dynamodb \
    @aws-sdk/client-cognito-identity-provider \
    @aws-sdk/client-secrets-manager

# Set environment
ENV NODE_ENV=production

# Run the orchestrator
CMD ["node", "dist/index.js"]
