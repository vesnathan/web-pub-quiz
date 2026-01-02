"use client";

import { useState } from "react";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Chip,
} from "@nextui-org/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGameStore } from "@/stores/gameStore";
import { useChatStore } from "@/stores/chatStore";
import { ChangePasswordModal } from "./auth/ChangePasswordModal";
import { ChatDrawer } from "./chat";

const ADMIN_EMAIL = "vesnathan+qnl-admin@gmail.com";

interface LobbyBottomBarProps {
  isConnected?: boolean;
  activeUserCount?: number;
}

export function LobbyBottomBar({
  isConnected = false,
  activeUserCount = 0,
}: LobbyBottomBarProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { openChat } = useChatStore();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { isSetActive } = useGameStore();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const getInitials = (email: string) => {
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      "bg-gradient-to-br from-pink-500 to-orange-400",
      "bg-gradient-to-br from-cyan-500 to-blue-500",
      "bg-gradient-to-br from-green-400 to-cyan-500",
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-yellow-400 to-orange-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
    ];
    const hash = email
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-md border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-between">
          {/* Left - Status */}
          <div className="flex items-center gap-2">
            <Chip
              color={isSetActive ? "success" : "warning"}
              variant="flat"
              size="sm"
              className="font-bold text-xs"
            >
              {isSetActive ? "LIVE" : "BREAK"}
            </Chip>
            <Chip
              color={isConnected ? "success" : "default"}
              variant="flat"
              size="sm"
              className="text-xs"
            >
              {isConnected ? `${activeUserCount} online` : "Connecting..."}
            </Chip>
          </div>

          {/* Center - Links */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/about"
              className="text-gray-400 hover:text-white text-xs transition-colors"
            >
              About
            </Link>
          </div>

          {/* Right - Chat button and Avatar Menu (only for logged in users) */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* Chat Button */}
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => openChat()}
                className="text-gray-400 hover:text-white"
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
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </Button>

              <Dropdown placement="top-end">
                <DropdownTrigger>
                  <Avatar
                    as="button"
                    className={`transition-transform ${getAvatarColor(user.email)}`}
                    name={getInitials(user.email)}
                    size="sm"
                    showFallback
                  />
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="User menu"
                  variant="flat"
                  className="w-56"
                  itemClasses={{
                    base: "gap-4",
                  }}
                >
                  <DropdownItem
                    key="profile-header"
                    className="h-14 gap-2 opacity-100"
                    textValue="Profile"
                    isReadOnly
                  >
                    <p className="font-semibold text-white">Signed in as</p>
                    <p className="text-sm text-gray-400 truncate">
                      {user.email}
                    </p>
                  </DropdownItem>
                  <DropdownItem
                    key="profile"
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    }
                  >
                    My Profile
                  </DropdownItem>
                  <DropdownItem
                    key="change-password"
                    onPress={() => setShowChangePassword(true)}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
                    }
                  >
                    Change Password
                  </DropdownItem>
                  <DropdownItem
                    key="admin"
                    onPress={() => router.push("/admin")}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    }
                    className={isAdmin ? "text-purple-400" : "hidden"}
                  >
                    Admin Dashboard
                  </DropdownItem>
                  <DropdownItem
                    key="logout"
                    color="danger"
                    onPress={handleSignOut}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                    }
                  >
                    Log Out
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Sign in to play</div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Chat drawer - only for authenticated users */}
      {user && <ChatDrawer />}
    </>
  );
}
