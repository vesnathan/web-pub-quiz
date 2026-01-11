"use client";

import { useAuth } from "@/contexts/AuthContext";
import { BannedUserModal } from "./BannedUserModal";
import { StrikeWarningModal } from "./StrikeWarningModal";

export function ModerationModals() {
  const {
    user,
    isBanned,
    banReason,
    strikeWarningDismissed,
    dismissStrikeWarning,
    isLoading,
  } = useAuth();

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // Show banned modal if user is banned
  if (isBanned) {
    return <BannedUserModal isOpen={true} banReason={banReason} />;
  }

  // Show strike warning modal if user has strikes and hasn't dismissed it
  const moderation = user?.moderation;
  if (moderation && moderation.strikeCount > 0 && !strikeWarningDismissed) {
    return (
      <StrikeWarningModal
        isOpen={true}
        strikeCount={moderation.strikeCount}
        strikes={moderation.strikes}
        onDismiss={dismissStrikeWarning}
      />
    );
  }

  return null;
}
