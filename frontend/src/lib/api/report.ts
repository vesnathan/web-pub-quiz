/**
 * Report API functions
 * Wraps GraphQL operations for user reporting
 */
import { graphqlClient } from "@/lib/graphql";
import { REPORT_USER } from "@/graphql/mutations";

type ReportReason =
  | "INAPPROPRIATE_AVATAR"
  | "OFFENSIVE_MESSAGE"
  | "HARASSMENT"
  | "SPAM";

type ReportContext = "CHAT_MESSAGE" | "AVATAR" | "PROFILE";

export interface ReportUserInput {
  reportedUserId: string;
  reason: ReportReason;
  context: ReportContext;
  description?: string;
  messageContent?: string;
  messageId?: string;
}

export interface ReportUserResult {
  success: boolean;
  message?: string;
}

interface ReportUserResponse {
  data?: {
    reportUser?: ReportUserResult;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Report a user for inappropriate behavior
 */
export async function reportUser(
  input: ReportUserInput,
): Promise<ReportUserResult> {
  try {
    const result = (await graphqlClient.graphql({
      query: REPORT_USER,
      variables: { input },
    })) as ReportUserResponse;

    if (result.errors?.length) {
      return {
        success: false,
        message: result.errors[0].message,
      };
    }

    return (
      result.data?.reportUser ?? {
        success: false,
        message: "Failed to submit report",
      }
    );
  } catch (error) {
    console.error("Report user error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to submit report",
    };
  }
}
