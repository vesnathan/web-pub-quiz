"use client";

import { create } from "zustand";
import type { Conversation } from "@quiz/shared";

interface ChatState {
  // Drawer state
  isOpen: boolean;
  activeConversation: string | null; // null = list view, 'lobby' = lobby chat, or conversation ID
  conversations: Conversation[];

  // Actions
  openChat: (conversationId?: string) => void;
  closeChat: () => void;
  setActiveConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  goToList: () => void;
  openLobby: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  activeConversation: null,
  conversations: [],

  openChat: (conversationId) =>
    set((state) => ({
      isOpen: true,
      activeConversation: conversationId ?? state.activeConversation,
    })),

  closeChat: () => set({ isOpen: false }),

  setActiveConversation: (id) => set({ activeConversation: id }),

  setConversations: (conversations) => set({ conversations }),

  goToList: () => set({ activeConversation: null }),

  openLobby: () => set({ isOpen: true, activeConversation: "lobby" }),
}));
