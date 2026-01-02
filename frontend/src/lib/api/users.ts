/**
 * User API functions
 * Wraps GraphQL operations with Zod validation
 */
import { graphqlClient } from "@/lib/graphql";
import {
  GET_MY_PROFILE,
  GET_USER_PROFILE,
  CHECK_DISPLAY_NAME_AVAILABLE,
  CHECK_EMAIL_HAS_GOOGLE_ACCOUNT,
} from "@/graphql/queries";
import { UPDATE_DISPLAY_NAME, ENSURE_PROFILE } from "@/graphql/mutations";
import type { User, UserPublic } from "@quiz/shared";
import { UserSchema, UserPublicSchema } from "@/schemas/ValidationSchemas";

interface GetMyProfileResponse {
  data?: {
    getMyProfile?: unknown;
  };
}

interface GetUserProfileResponse {
  data?: {
    getUserProfile?: unknown;
  };
}

interface CheckDisplayNameResponse {
  data?: {
    checkDisplayNameAvailable?: boolean;
  };
}

interface CheckEmailHasGoogleAccountResponse {
  data?: {
    checkEmailHasGoogleAccount?: boolean;
  };
}

interface UpdateDisplayNameResponse {
  data?: {
    updateDisplayName?: unknown;
  };
}

interface EnsureProfileResponse {
  data?: {
    ensureProfile?: unknown;
  };
}

/**
 * Get the current user's profile
 */
export async function getMyProfile(): Promise<User | null> {
  const result = (await graphqlClient.graphql({
    query: GET_MY_PROFILE,
  })) as GetMyProfileResponse;

  if (!result.data?.getMyProfile) {
    return null;
  }

  return UserSchema.parse(result.data.getMyProfile) as User;
}

/**
 * Get a public user profile by ID
 */
export async function getUserProfile(
  userId: string,
): Promise<UserPublic | null> {
  const result = (await graphqlClient.graphql({
    query: GET_USER_PROFILE,
    variables: { userId },
  })) as GetUserProfileResponse;

  if (!result.data?.getUserProfile) {
    return null;
  }

  return UserPublicSchema.parse(result.data.getUserProfile) as UserPublic;
}

/**
 * Check if a display name is available
 */
export async function checkDisplayNameAvailable(
  displayName: string,
): Promise<boolean> {
  const result = (await graphqlClient.graphql({
    query: CHECK_DISPLAY_NAME_AVAILABLE,
    variables: { displayName },
    authMode: "iam",
  })) as CheckDisplayNameResponse;

  return result.data?.checkDisplayNameAvailable ?? false;
}

/**
 * Check if an email has a Google account associated
 */
export async function checkEmailHasGoogleAccount(
  email: string,
): Promise<boolean> {
  const result = (await graphqlClient.graphql({
    query: CHECK_EMAIL_HAS_GOOGLE_ACCOUNT,
    variables: { email },
    authMode: "iam",
  })) as CheckEmailHasGoogleAccountResponse;

  return result.data?.checkEmailHasGoogleAccount ?? false;
}

/**
 * Update the current user's display name
 * Returns partial User with just id and displayName
 */
export async function updateDisplayName(
  displayName: string,
): Promise<Pick<User, "id" | "displayName"> | null> {
  const result = (await graphqlClient.graphql({
    query: UPDATE_DISPLAY_NAME,
    variables: { displayName },
  })) as UpdateDisplayNameResponse;

  if (!result.data?.updateDisplayName) {
    return null;
  }

  // Validate structure and cast to codegen type
  const data = result.data.updateDisplayName as {
    id: string;
    displayName: string;
  };
  return data;
}

/**
 * Ensure a user profile exists (creates if not exists)
 */
export async function ensureProfile(displayName: string): Promise<User | null> {
  const result = (await graphqlClient.graphql({
    query: ENSURE_PROFILE,
    variables: { displayName },
  })) as EnsureProfileResponse;

  if (!result.data?.ensureProfile) {
    return null;
  }

  return UserSchema.parse(result.data.ensureProfile) as User;
}
