"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Chip,
} from "@nextui-org/react";
import { useAuth } from "@/contexts/AuthContext";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { SocialShareButtons } from "@/components/SocialShareButtons";
import { generateClient } from "aws-amplify/api";
import { SEND_INVITE } from "@/graphql/mutations";

const client = generateClient();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://quiznight.live";

interface InviteFriendProps {
  className?: string;
}

type SendStatus = "idle" | "sending" | "success" | "error";

/**
 * Invite a Friend component with email invite and social share buttons
 * Displayed in the welcome card header for authenticated users
 */
export function InviteFriend({ className = "" }: InviteFriendProps) {
  const { user } = useAuth();
  const { executeRecaptcha, isConfigured } = useRecaptcha();

  const [isOpen, setIsOpen] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [email, setEmail] = useState("");
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const referralUrl = user ? `${APP_URL}/?ref=${user.userId}` : APP_URL;

  const resetForm = () => {
    setFriendName("");
    setEmail("");
    setSendStatus("idle");
    setErrorMessage("");
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form when closing
      setTimeout(resetForm, 300);
    }
  };

  const handleSendInvite = async () => {
    if (!friendName.trim() || !email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address");
      setSendStatus("error");
      return;
    }

    setSendStatus("sending");
    setErrorMessage("");

    try {
      // Get reCAPTCHA token
      let recaptchaToken = "";
      if (isConfigured) {
        const token = await executeRecaptcha("send_invite");
        if (!token) {
          throw new Error("reCAPTCHA verification failed. Please try again.");
        }
        recaptchaToken = token;
      }

      // Send invite via GraphQL
      await client.graphql({
        query: SEND_INVITE,
        variables: {
          friendName: friendName.trim(),
          email: email.trim(),
          recaptchaToken,
        },
      });

      setSendStatus("success");

      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(resetForm, 300);
      }, 2000);
    } catch (error) {
      console.error("Failed to send invite:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send invite. Please try again.";
      setErrorMessage(message);
      setSendStatus("error");
    }
  };

  const isFormValid = friendName.trim().length > 0 && email.trim().length > 0;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-2 ${className}`}
    >
      <Popover
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        placement="bottom"
        showArrow
        classNames={{
          content: "bg-gray-900 border border-gray-700",
        }}
      >
        <PopoverTrigger>
          <Button
            size="sm"
            variant="flat"
            className="bg-primary-900/30 text-primary-300 hover:bg-primary-900/50 h-7 px-3"
            startContent={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          >
            Invite a Friend
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-white font-semibold text-lg">
                Invite a Friend
              </h3>
              <p className="text-gray-400 text-sm">
                Send an email invite or share on social media
              </p>
            </div>

            {sendStatus === "success" ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-900/30 mb-3">
                  <svg
                    className="w-6 h-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-green-400 font-medium">Invite sent!</p>
                <p className="text-gray-400 text-sm mt-1">
                  {friendName} will receive your invitation shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Input
                    label="Friend's Name"
                    placeholder="Enter their name"
                    value={friendName}
                    onValueChange={setFriendName}
                    size="sm"
                    variant="bordered"
                    isDisabled={sendStatus === "sending"}
                    classNames={{
                      input: "text-white",
                      label: "text-gray-400",
                    }}
                  />
                  <Input
                    label="Email Address"
                    placeholder="friend@example.com"
                    type="email"
                    value={email}
                    onValueChange={setEmail}
                    size="sm"
                    variant="bordered"
                    isDisabled={sendStatus === "sending"}
                    isInvalid={sendStatus === "error"}
                    errorMessage={sendStatus === "error" ? errorMessage : ""}
                    classNames={{
                      input: "text-white",
                      label: "text-gray-400",
                    }}
                  />
                </div>

                <Button
                  color="primary"
                  className="w-full"
                  onPress={handleSendInvite}
                  isDisabled={!isFormValid || sendStatus === "sending"}
                  isLoading={sendStatus === "sending"}
                >
                  Send Email Invite
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Protected by reCAPTCHA -{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:underline"
                  >
                    Privacy
                  </a>
                  {" & "}
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:underline"
                  >
                    Terms
                  </a>
                </p>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-500">
                      or share via
                    </span>
                  </div>
                </div>

                <SocialShareButtons
                  url={referralUrl}
                  title="Join me on Quiz Night Live!"
                  description="Play live trivia battles with players from around the world."
                  className="justify-center"
                />

                <div className="pt-2 border-t border-gray-700">
                  <p className="text-gray-500 text-xs text-center">
                    Your referral link:
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={referralUrl}
                      isReadOnly
                      size="sm"
                      variant="flat"
                      classNames={{
                        input: "text-gray-400 text-xs",
                        inputWrapper: "bg-gray-800/50",
                      }}
                    />
                    <Button
                      size="sm"
                      variant="flat"
                      className="bg-gray-800/50 min-w-12"
                      onPress={() => {
                        navigator.clipboard.writeText(referralUrl);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <SocialShareButtons
        url={referralUrl}
        title="Join me on Quiz Night Live!"
        description="Play live trivia battles with players from around the world."
      />
    </div>
  );
}
