"use client";

import { useState } from "react";
import {
  Navbar as NextUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from "@nextui-org/react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "./auth/AuthModal";
import { ChangePasswordModal } from "./auth/ChangePasswordModal";
import { ChatDrawer } from "./chat";
import { useChatStore } from "@/stores/chatStore";

interface NavbarProps {
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export function Navbar({ onProfileClick, onSettingsClick }: NavbarProps) {
  const { user, isAuthenticated, signOut, isLoading } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { openChat } = useChatStore();

  const handleLogin = () => {
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setAuthMode("register");
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
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
      <NextUINavbar
        className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800"
        maxWidth="full"
        height="4rem"
      >
        <NavbarBrand>
          <img src="/logo-small.png" alt="Quiz Night" className="h-10 w-10" />
        </NavbarBrand>

        <NavbarContent justify="end">
          {isLoading ? (
            <NavbarItem>
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            </NavbarItem>
          ) : isAuthenticated && user ? (
            <>
              <NavbarItem>
                <Button
                  isIconOnly
                  variant="light"
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
              </NavbarItem>
              <NavbarItem>
                <Dropdown placement="bottom-end">
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
                      onPress={onProfileClick}
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
                      key="settings"
                      onPress={onSettingsClick}
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
                    >
                      Settings
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
              </NavbarItem>
            </>
          ) : (
            <>
              <NavbarItem>
                <Button
                  variant="light"
                  onPress={handleLogin}
                  className="text-gray-300 hover:text-white"
                >
                  Log In
                </Button>
              </NavbarItem>
              <NavbarItem>
                <Button color="primary" onPress={handleRegister}>
                  Sign Up
                </Button>
              </NavbarItem>
            </>
          )}
        </NavbarContent>
      </NextUINavbar>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <ChatDrawer />
    </>
  );
}
