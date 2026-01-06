/**
 * Chat API functions
 * Wraps GraphQL operations with Zod validation
 */
import { graphqlClient } from "@/lib/graphql";
import { GET_CHAT_MESSAGES, GET_MY_CONVERSATIONS } from "@/graphql/queries";
import { SEND_CHAT_MESSAGE, START_CONVERSATION } from "@/graphql/mutations";
import { ON_NEW_CHAT_MESSAGE } from "@/graphql/subscriptions";
import type {
  ChatMessage,
  ChatMessageConnection,
  Conversation,
} from "@quiz/shared";
import {
  ChatMessagesResponseSchema,
  ChatMessageSchema,
  ConversationSchema,
} from "@/schemas/ValidationSchemas";
import { z } from "zod";

interface GetChatMessagesResponse {
  data?: {
    getChatMessages?: unknown;
  };
}

interface GetMyConversationsResponse {
  data?: {
    getMyConversations?: unknown[];
  };
}

interface SendChatMessageResponse {
  data?: {
    sendChatMessage?: unknown;
  };
}

interface StartConversationResponse {
  data?: {
    startConversation?: unknown;
  };
}

/**
 * Get chat messages for a channel
 */
export async function getChatMessages(
  channelId: string,
  limit?: number,
  nextToken?: string,
): Promise<ChatMessageConnection> {
  const result = (await graphqlClient.graphql({
    query: GET_CHAT_MESSAGES,
    variables: { channelId, limit, nextToken },
  })) as GetChatMessagesResponse;

  if (!result.data?.getChatMessages) {
    return { items: [], nextToken: null };
  }

  return ChatMessagesResponseSchema.parse(
    result.data.getChatMessages,
  ) as ChatMessageConnection;
}

/**
 * Get the current user's conversations
 */
export async function getMyConversations(
  limit?: number,
): Promise<Conversation[]> {
  const result = (await graphqlClient.graphql({
    query: GET_MY_CONVERSATIONS,
    variables: { limit },
  })) as GetMyConversationsResponse;

  if (!result.data?.getMyConversations) {
    return [];
  }

  return z
    .array(ConversationSchema)
    .parse(result.data.getMyConversations) as Conversation[];
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  channelId: string,
  content: string,
): Promise<ChatMessage | null> {
  const result = (await graphqlClient.graphql({
    query: SEND_CHAT_MESSAGE,
    variables: { channelId, content },
  })) as SendChatMessageResponse;

  if (!result.data?.sendChatMessage) {
    return null;
  }

  return ChatMessageSchema.parse(result.data.sendChatMessage) as ChatMessage;
}

/**
 * Start a new conversation with a user
 */
export async function startConversation(
  targetUserId: string,
  targetDisplayName: string,
): Promise<Conversation | null> {
  const result = (await graphqlClient.graphql({
    query: START_CONVERSATION,
    variables: { targetUserId, targetDisplayName },
  })) as StartConversationResponse;

  if (!result.data?.startConversation) {
    return null;
  }

  return ConversationSchema.parse(
    result.data.startConversation,
  ) as Conversation;
}

/**
 * Subscription callback types
 */
export interface ChatMessageSubscriptionCallbacks {
  onMessage: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

/**
 * Subscribe to new chat messages for a channel with automatic retry on failure.
 * Returns an object with an unsubscribe method.
 *
 * Retry strategy:
 * - Exponential backoff starting at 1 second, maxing at 30 seconds
 * - Infinite retries until manually unsubscribed
 */
export function subscribeToChatMessages(
  channelId: string,
  callbacks: ChatMessageSubscriptionCallbacks,
): { unsubscribe: () => void } {
  let currentSub: { unsubscribe: () => void } | null = null;
  let retryCount = 0;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let isUnsubscribed = false;

  const MAX_RETRY_DELAY = 30000; // 30 seconds
  const BASE_RETRY_DELAY = 1000; // 1 second

  const calculateRetryDelay = (attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const delay = Math.min(
      BASE_RETRY_DELAY * Math.pow(2, attempt),
      MAX_RETRY_DELAY,
    );
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  };

  const createSubscription = () => {
    if (isUnsubscribed) return;

    const subscription = graphqlClient.graphql({
      query: ON_NEW_CHAT_MESSAGE,
      variables: { channelId },
    });

    // @ts-expect-error - Amplify subscription type mismatch
    currentSub = subscription.subscribe({
      next: ({ data }: { data: { onNewChatMessage: ChatMessage } }) => {
        // Reset retry count on successful message
        retryCount = 0;
        if (data.onNewChatMessage) {
          callbacks.onMessage(data.onNewChatMessage);
        }
      },
      error: (error: Error) => {
        console.error("Chat subscription error:", error);

        if (callbacks.onError) {
          callbacks.onError(error);
        }

        // Attempt to reconnect if not manually unsubscribed
        if (!isUnsubscribed) {
          const delay = calculateRetryDelay(retryCount);
          retryCount++;

          console.log(
            `Chat subscription reconnecting in ${Math.round(delay / 1000)}s (attempt ${retryCount})`,
          );

          retryTimeout = setTimeout(() => {
            if (!isUnsubscribed) {
              if (callbacks.onReconnect) {
                callbacks.onReconnect();
              }
              createSubscription();
            }
          }, delay);
        }
      },
    });
  };

  // Start the subscription
  createSubscription();

  return {
    unsubscribe: () => {
      isUnsubscribed = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      if (currentSub) {
        currentSub.unsubscribe();
        currentSub = null;
      }
    },
  };
}
