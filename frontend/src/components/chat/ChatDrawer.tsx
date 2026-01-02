"use client";

import { useEffect } from "react";
import { Avatar } from "@nextui-org/react";
import { LoadingDots } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations } from "@/hooks/queries";
import { ChatPanel } from "./ChatPanel";
import { useChatStore } from "@/stores/chatStore";
import type { Conversation } from "@quiz/shared";

interface ChatDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatDrawer({
  isOpen: propIsOpen,
  onClose: propOnClose,
}: ChatDrawerProps) {
  const { user, isAuthenticated } = useAuth();
  const {
    isOpen: storeIsOpen,
    activeConversation,
    conversations,
    closeChat,
    setActiveConversation,
    setConversations,
    goToList,
  } = useChatStore();

  // Use prop values if provided, otherwise use store
  const isOpen = propIsOpen ?? storeIsOpen;
  const onClose = propOnClose ?? closeChat;

  // Fetch conversations using TanStack Query
  const { data: fetchedConversations, isLoading } = useConversations(
    20,
    isAuthenticated && isOpen,
  );

  // Sync fetched conversations to store for other components
  useEffect(() => {
    if (fetchedConversations) {
      setConversations(fetchedConversations);
    }
  }, [fetchedConversations, setConversations]);

  const loading = isLoading;

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.id !== user?.userId);
  };

  const getInitials = (name: string) => {
    const parts = name.split(/[._-\s]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      "bg-gradient-to-br from-pink-500 to-orange-400",
      "bg-gradient-to-br from-cyan-500 to-blue-500",
      "bg-gradient-to-br from-green-400 to-cyan-500",
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-yellow-400 to-orange-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
    ];
    const hash = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {activeConversation ? (
          <>
            <button
              onClick={goToList}
              className="text-gray-400 hover:text-white mr-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-white flex-1">
              {(() => {
                const conv = conversations.find(
                  (c) => c.id === activeConversation,
                );
                const other = conv ? getOtherParticipant(conv) : null;
                return other?.displayName || "Chat";
              })()}
            </h2>
          </>
        ) : (
          <h2 className="text-lg font-semibold text-white">Messages</h2>
        )}
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      {activeConversation ? (
        <ChatPanel
          channelId={activeConversation}
          className="flex-1 border-0 rounded-none"
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Lobby Chat */}
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => setActiveConversation("lobby")}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-white">Lobby Chat</p>
                <p className="text-sm text-gray-400">
                  Public chat with all players
                </p>
              </div>
            </button>
          </div>

          {/* Private Conversations */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Private Messages
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <LoadingDots />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No conversations yet
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conversation) => {
                  const other = getOtherParticipant(conversation);
                  if (!other) return null;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveConversation(conversation.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Avatar
                        className={`w-10 h-10 ${getAvatarColor(other.id)}`}
                        name={getInitials(other.displayName)}
                        size="sm"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-baseline justify-between">
                          <p className="font-medium text-white truncate">
                            {other.displayName}
                          </p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatTime(conversation.updatedAt)}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <p className="text-sm text-gray-400 truncate">
                            {conversation.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
