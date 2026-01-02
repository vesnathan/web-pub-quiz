/**
 * CloudFormation Custom Resource Lambda that waits for AppSync schema to be ready.
 *
 * This solves the race condition where CloudFormation's DependsOn only checks
 * resource existence, not update completion. When adding new resolvers that
 * reference new schema fields, resolvers might be created before the schema
 * update completes, causing "No field named X" errors.
 *
 * This Lambda is invoked as a Custom Resource that depends on GraphQLSchema.
 * All resolvers depend on this Custom Resource, ensuring the schema is fully
 * updated before resolver creation proceeds.
 */

import {
  AppSyncClient,
  GetSchemaCreationStatusCommand,
} from '@aws-sdk/client-appsync';

const appSyncClient = new AppSyncClient({});

interface CloudFormationEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResponseURL: string;
  StackId: string;
  RequestId: string;
  ResourceType: string;
  LogicalResourceId: string;
  PhysicalResourceId?: string;
  ResourceProperties: {
    ApiId: string;
    SchemaHash: string;
  };
}

interface CloudFormationResponse {
  Status: 'SUCCESS' | 'FAILED';
  Reason?: string;
  PhysicalResourceId: string;
  StackId: string;
  RequestId: string;
  LogicalResourceId: string;
  Data?: Record<string, string>;
}

async function sendResponse(
  event: CloudFormationEvent,
  status: 'SUCCESS' | 'FAILED',
  reason?: string,
  data?: Record<string, string>
): Promise<void> {
  const response: CloudFormationResponse = {
    Status: status,
    Reason: reason || `See CloudWatch Log Stream`,
    PhysicalResourceId: event.PhysicalResourceId || `schema-ready-${event.ResourceProperties.ApiId}`,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  };

  const responseBody = JSON.stringify(response);
  console.log('Sending response:', responseBody);

  const url = new URL(event.ResponseURL);
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': '',
      'Content-Length': responseBody.length.toString(),
    },
    body: responseBody,
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Failed to send response: ${res.status} ${res.statusText}`);
  }
}

async function waitForSchemaReady(apiId: string, schemaHash: string): Promise<void> {
  console.log(`Waiting for schema to be ready for API: ${apiId}, expected hash: ${schemaHash}`);

  // Wait for schema creation to start (status becomes PROCESSING) and complete (SUCCESS)
  // CloudFormation may start the schema update AFTER this custom resource begins executing,
  // so we need to wait long enough for CloudFormation to start the schema update.
  // Timeline observed: custom resource started, then 50+ seconds later schema update started.
  // We wait up to 90 seconds (45 attempts x 2s) for schema update to start.
  const maxAttempts = 45;
  let sawProcessing = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await appSyncClient.send(new GetSchemaCreationStatusCommand({
        apiId,
      }));

      const status = response.status;
      console.log(`Attempt ${attempt}/${maxAttempts}: Schema status = ${status}, sawProcessing = ${sawProcessing}`);

      if (status === 'PROCESSING') {
        sawProcessing = true;
        console.log('Schema update is in progress...');
      } else if (status === 'SUCCESS' || status === 'ACTIVE') {
        if (sawProcessing) {
          // We saw PROCESSING and now it's SUCCESS - the new schema is ready
          console.log('Schema update completed successfully');
          return;
        }
        // On first attempts, we see SUCCESS from the old schema
        // Wait for CloudFormation to start the schema update
        if (attempt <= 40) {
          // Wait up to 80 seconds for schema update to start
          console.log(`Attempt ${attempt}/40: Schema shows SUCCESS but waiting for new schema update to start...`);
        } else {
          // After 80 seconds, if still SUCCESS without seeing PROCESSING,
          // assume there's no schema update happening and proceed
          console.log('No schema update detected after 80 seconds, proceeding with current schema');
          return;
        }
      } else if (status === 'FAILED') {
        throw new Error(`Schema creation failed: ${response.details || 'No details'}`);
      }
      // NOT_APPLICABLE or waiting for PROCESSING - continue
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'NotFoundException') {
        console.log(`Attempt ${attempt}/${maxAttempts}: Schema not found yet, waiting...`);
      } else {
        throw error;
      }
    }

    // Wait 2 seconds before next attempt
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // If we saw PROCESSING but never saw SUCCESS, that's a timeout
  if (sawProcessing) {
    throw new Error(`Schema update timed out after ${maxAttempts} attempts (90 seconds)`);
  }

  // If we never saw PROCESSING after 90 seconds, assume no update is happening
  console.log('No schema update in progress after 90 seconds, proceeding');
}

export async function handler(event: CloudFormationEvent): Promise<void> {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const { RequestType, ResourceProperties } = event;
    const { ApiId, SchemaHash } = ResourceProperties;

    if (RequestType === 'Delete') {
      // Nothing to do on delete
      await sendResponse(event, 'SUCCESS', 'Delete successful');
      return;
    }

    // For Create and Update, wait for schema to be ready
    console.log(`Processing ${RequestType} for API ${ApiId} with schema hash ${SchemaHash}`);
    await waitForSchemaReady(ApiId, SchemaHash);

    await sendResponse(event, 'SUCCESS', 'Schema is ready', {
      SchemaHash,
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    await sendResponse(event, 'FAILED', message);
  }
}
