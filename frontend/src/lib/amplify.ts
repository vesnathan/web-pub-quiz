"use client";

import { Amplify, type ResourcesConfig } from "aws-amplify";

const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION || "ap-southeast-2";
const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "";
const GOOGLE_OAUTH_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

// Determine redirect URL based on environment
function getRedirectUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
}

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || "",
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "",
      identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || "",
      allowGuestAccess: true,
      loginWith: {
        email: true,
        oauth: COGNITO_DOMAIN
          ? {
              domain: COGNITO_DOMAIN,
              scopes: [
                "email",
                "openid",
                "profile",
                "aws.cognito.signin.user.admin",
              ],
              redirectSignIn: [getRedirectUrl()],
              redirectSignOut: [getRedirectUrl()],
              responseType: "code",
            }
          : undefined,
      },
      signUpVerificationMethod: "code" as const,
      userAttributes: {
        email: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: false,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_URL || "",
      region: AWS_REGION,
      defaultAuthMode: "userPool" as const,
    },
  },
};

let isConfigured = false;

export function configureAmplify() {
  if (typeof window !== "undefined" && !isConfigured) {
    Amplify.configure(amplifyConfig, { ssr: true });
    isConfigured = true;
  }
}

export { GOOGLE_OAUTH_ENABLED };
export default amplifyConfig;
