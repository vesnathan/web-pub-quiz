/**
 * GraphQL client for AWS AppSync
 *
 * This module provides the Amplify GraphQL client.
 * For GraphQL queries and mutations, see @/graphql/
 * For API functions with validation, see @/lib/api/
 */
import { generateClient } from "aws-amplify/api";

export const graphqlClient = generateClient();
