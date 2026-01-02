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
  mutation StartConversation($targetUserId: ID!) {
    startConversation(targetUserId: $targetUserId) {
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
