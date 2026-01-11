// GraphQL mutations - these are parsed by codegen to generate operation types

export const UPDATE_DISPLAY_NAME = /* GraphQL */ `
  mutation UpdateDisplayName($displayName: String!) {
    updateDisplayName(displayName: $displayName) {
      id
      displayName
    }
  }
`;

export const ENSURE_PROFILE = /* GraphQL */ `
  mutation EnsureProfile($displayName: String!) {
    ensureProfile(displayName: $displayName) {
      id
      email
      displayName
      createdAt
      stats {
        totalCorrect
        totalWrong
        totalPoints
        setsPlayed
        setsWon
        currentStreak
        longestStreak
      }
      subscription {
        tier
        status
        provider
        subscriptionId
        customerId
        startedAt
        expiresAt
        cancelledAt
      }
    }
  }
`;

export const CREATE_CHECKOUT_SESSION = /* GraphQL */ `
  mutation CreateCheckoutSession($input: CreateCheckoutInput!) {
    createCheckoutSession(input: $input) {
      checkoutUrl
      sessionId
    }
  }
`;

export const SEND_CHAT_MESSAGE = /* GraphQL */ `
  mutation SendChatMessage($channelId: ID!, $content: String!) {
    sendChatMessage(channelId: $channelId, content: $content) {
      id
      channelId
      senderId
      senderDisplayName
      content
      createdAt
    }
  }
`;

export const START_CONVERSATION = /* GraphQL */ `
  mutation StartConversation($targetUserId: ID!, $targetDisplayName: String!) {
    startConversation(
      targetUserId: $targetUserId
      targetDisplayName: $targetDisplayName
    ) {
      id
      participantIds
      participants {
        id
        displayName
      }
      updatedAt
    }
  }
`;

export const ADMIN_GIFT_SUBSCRIPTION = /* GraphQL */ `
  mutation AdminGiftSubscription($input: GiftSubscriptionInput!) {
    adminGiftSubscription(input: $input) {
      id
      displayName
      email
      subscription {
        tier
        status
        startedAt
        expiresAt
        giftedBy
        giftedByName
        giftedAt
        giftExpiresAt
        giftNotificationSeen
      }
    }
  }
`;

export const ADMIN_UPDATE_USER_TIER = /* GraphQL */ `
  mutation AdminUpdateUserTier($userId: ID!, $tier: Int!) {
    adminUpdateUserTier(userId: $userId, tier: $tier) {
      id
      subscription {
        tier
        status
      }
    }
  }
`;

export const MARK_GIFT_NOTIFICATION_SEEN = /* GraphQL */ `
  mutation MarkGiftNotificationSeen {
    markGiftNotificationSeen
  }
`;

export const CREATE_TIP_CHECKOUT = /* GraphQL */ `
  mutation CreateTipCheckout($provider: SubscriptionProvider!) {
    createTipCheckout(provider: $provider) {
      checkoutUrl
      sessionId
    }
  }
`;

export const SEND_INVITE = /* GraphQL */ `
  mutation SendInvite(
    $friendName: String!
    $email: String!
    $recaptchaToken: String!
  ) {
    sendInvite(
      friendName: $friendName
      email: $email
      recaptchaToken: $recaptchaToken
    )
  }
`;

export const RECORD_REFERRAL = /* GraphQL */ `
  mutation RecordReferral($referrerId: ID!) {
    recordReferral(referrerId: $referrerId)
  }
`;

export const SEND_CONTACT = /* GraphQL */ `
  mutation SendContact(
    $name: String!
    $email: String!
    $subject: String!
    $message: String!
    $recaptchaToken: String!
  ) {
    sendContact(
      name: $name
      email: $email
      subject: $subject
      message: $message
      recaptchaToken: $recaptchaToken
    )
  }
`;

export const UPDATE_GAME_CONFIG = /* GraphQL */ `
  mutation UpdateGameConfig($input: UpdateGameConfigInput!) {
    updateGameConfig(input: $input) {
      maxPlayersPerRoom
      playersPerRoomThreshold
      resultsDisplayMs
      questionDurationMs
      freeTierDailyLimit
      difficultyPoints {
        easy {
          correct
          wrong
        }
        medium {
          correct
          wrong
        }
        hard {
          correct
          wrong
        }
      }
      maintenanceMode
      maintenanceMessage
      stripeTestMode
      updatedAt
      updatedBy
    }
  }
`;

export const DELETE_MY_ACCOUNT = /* GraphQL */ `
  mutation DeleteMyAccount {
    deleteMyAccount {
      success
      message
    }
  }
`;

export const REPORT_USER = /* GraphQL */ `
  mutation ReportUser($input: ReportUserInput!) {
    reportUser(input: $input) {
      success
      message
    }
  }
`;

export const UPDATE_REPORT_STATUS = /* GraphQL */ `
  mutation UpdateReportStatus($input: UpdateReportStatusInput!) {
    updateReportStatus(input: $input) {
      id
      status
      adminNotes
      resolvedAt
      resolvedBy
    }
  }
`;

export const SEND_ADMIN_MESSAGE = /* GraphQL */ `
  mutation SendAdminMessage($input: SendAdminMessageInput!) {
    sendAdminMessage(input: $input) {
      id
      fromAdminId
      toUserId
      subject
      content
      relatedReportId
      read
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = /* GraphQL */ `
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = /* GraphQL */ `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const ADD_STRIKE = /* GraphQL */ `
  mutation AddStrike($input: AddStrikeInput!) {
    addStrike(input: $input) {
      success
      message
      moderation {
        userId
        strikeCount
        isBanned
      }
    }
  }
`;

export const BAN_USER = /* GraphQL */ `
  mutation BanUser($input: BanUserInput!) {
    banUser(input: $input) {
      success
      message
      moderation {
        userId
        isBanned
        bannedAt
        bannedReason
      }
    }
  }
`;

export const UNBAN_USER = /* GraphQL */ `
  mutation UnbanUser($userId: ID!) {
    unbanUser(userId: $userId) {
      success
      message
      moderation {
        userId
        isBanned
      }
    }
  }
`;
