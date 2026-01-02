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
): Promise<Conversation | null> {
  const result = (await graphqlClient.graphql({
    query: START_CONVERSATION,
    variables: { targetUserId },
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
}

/**
 * Subscribe to new chat messages for a channel
 * Returns an object with an unsubscribe method
 */
export function subscribeToChatMessages(
  channelId: string,
  callbacks: ChatMessageSubscriptionCallbacks,
): { unsubscribe: () => void } {
  const subscription = graphqlClient.graphql({
    query: ON_NEW_CHAT_MESSAGE,
    variables: { channelId },
  });

  // @ts-expect-error - Amplify subscription type mismatch
  const sub = subscription.subscribe({
    next: ({ data }: { data: { onNewChatMessage: ChatMessage } }) => {
      if (data.onNewChatMessage) {
        callbacks.onMessage(data.onNewChatMessage);
      }
    },
    error: (error: Error) => {
      if (callbacks.onError) {
        callbacks.onError(error);
      } else {
        console.error("Chat subscription error:", error);
      }
    },
  });

  return {
    unsubscribe: () => sub.unsubscribe(),
  };
}
