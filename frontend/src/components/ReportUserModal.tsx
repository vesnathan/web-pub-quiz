"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  RadioGroup,
  Radio,
  Textarea,
} from "@nextui-org/react";
import { reportUser } from "@/lib/api/report";

type ReportReason =
  | "INAPPROPRIATE_AVATAR"
  | "OFFENSIVE_MESSAGE"
  | "HARASSMENT"
  | "SPAM";

type ReportContext = "CHAT_MESSAGE" | "AVATAR" | "PROFILE";

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    displayName: string;
  };
  context: ReportContext;
  messageContent?: string;
  messageId?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "INAPPROPRIATE_AVATAR", label: "Inappropriate avatar" },
  { value: "OFFENSIVE_MESSAGE", label: "Offensive message" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SPAM", label: "Spam" },
];

export function ReportUserModal({
  isOpen,
  onClose,
  targetUser,
  context,
  messageContent,
  messageId,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason) return;

    setIsSubmitting(true);
    setError("");

    try {
      const result = await reportUser({
        reportedUserId: targetUser.id,
        reason,
        context,
        description: description.trim() || undefined,
        messageContent,
        messageId,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.message || "Failed to submit report");
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    setError("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      classNames={{
        base: "bg-gray-800 text-white",
        header: "border-b border-gray-700",
        body: "py-6",
        footer: "border-t border-gray-700",
      }}
    >
      <ModalContent>
        {submitted ? (
          <>
            <ModalHeader>Report Submitted</ModalHeader>
            <ModalBody>
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/30 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-500"
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
                <p className="text-gray-300">
                  Thank you for your report. We&apos;ll review it shortly.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onPress={handleClose}>
                Close
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span>Report User</span>
              <span className="text-sm font-normal text-gray-400">
                {targetUser.displayName}
              </span>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {messageContent && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">
                      Reported message:
                    </p>
                    <p className="text-gray-300 text-sm">{messageContent}</p>
                  </div>
                )}

                <div>
                  <p className="text-gray-300 text-sm mb-3">
                    Why are you reporting this user?
                  </p>
                  <RadioGroup
                    value={reason}
                    onValueChange={(value) => setReason(value as ReportReason)}
                    classNames={{
                      wrapper: "gap-2",
                    }}
                  >
                    {REPORT_REASONS.map((r) => (
                      <Radio
                        key={r.value}
                        value={r.value}
                        classNames={{
                          base: "max-w-full m-0 bg-gray-900/50 hover:bg-gray-900 rounded-lg p-3 border border-gray-700 cursor-pointer data-[selected=true]:border-primary",
                          label: "text-gray-300",
                        }}
                      >
                        {r.label}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Textarea
                    label="Additional details (optional)"
                    placeholder="Please describe what happened..."
                    value={description}
                    onValueChange={setDescription}
                    minRows={3}
                    maxRows={5}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-900/50 border-gray-700",
                    }}
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={handleClose}
                isDisabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleSubmit}
                isDisabled={!reason || isSubmitting}
                isLoading={isSubmitting}
              >
                Submit Report
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
