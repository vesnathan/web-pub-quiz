"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button, Input, Avatar } from "@nextui-org/react";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingDots } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useChatMessages, chatMessagesKeys } from "@/hooks/queries";
import { sendChatMessage, subscribeToChatMessages } from "@/lib/api";
import type { ChatMessage, ChatMessageConnection } from "@quiz/shared";

interface ChatPanelProps {
  channelId: string;
  title?: string;
  className?: string;
}

export function ChatPanel({
  channelId,
  title = "Chat",
  className = "",
}: ChatPanelProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Fetch messages using TanStack Query
  const { data, isLoading } = useChatMessages(channelId, 50, isAuthenticated);
  const messages = data?.items ? [...data.items].reverse() : [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Subscribe to new messages and update cache
  useEffect(() => {
    if (!isAuthenticated) return;

    subscriptionRef.current = subscribeToChatMessages(channelId, {
      onMessage: (message) => {
        // Update TanStack Query cache with new message
        queryClient.setQueryData<ChatMessageConnection>(
          chatMessagesKeys.byChannel(channelId),
          (old) => {
            if (!old) return { items: [message], nextToken: null };
            // Avoid duplicates
            if (old.items.some((m) => m.id === message.id)) return old;
            return { ...old, items: [...old.items, message] };
          },
        );
      },
      onError: (error) => {
        console.error("Subscription error:", error);
      },
    });

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [channelId, isAuthenticated, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !isAuthenticated) return;

    setSending(true);
    try {
      await sendChatMessage(channelId, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!isAuthenticated) {
    return (
      <div
        className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 ${className}`}
      >
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          Sign in to chat
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center">
            <LoadingDots />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.userId;
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar
                  className={`w-8 h-8 text-xs flex-shrink-0 ${getAvatarColor(message.senderId)}`}
                  name={getInitials(message.senderDisplayName)}
                  size="sm"
                />
                <div
                  className={`max-w-[70%] ${
                    isOwn ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`flex items-baseline gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <span className="text-xs font-medium text-gray-300">
                      {isOwn ? "You" : message.senderDisplayName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${
                      isOwn
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-gray-800 text-gray-100 rounded-bl-none"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            variant="bordered"
            size="sm"
            isDisabled={sending}
            classNames={{
              input: "text-white",
              inputWrapper: "border-gray-600",
            }}
          />
          <Button
            color="primary"
            size="sm"
            isLoading={sending}
            isDisabled={!newMessage.trim()}
            onPress={handleSendMessage}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
