// GraphQL queries - these are parsed by codegen to generate operation types

export const GET_MY_PROFILE = /* GraphQL */ `
  query GetMyProfile {
    getMyProfile {
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
        giftedBy
        giftedByName
        giftedAt
        giftExpiresAt
        giftNotificationSeen
      }
      badges {
        id
        name
        description
        icon
        groupId
        tier
        rarity
        skillPoints
        earnedAt
      }
      totalSkillPoints
      tipUnlockedUntil
    }
  }
`;

export const GET_USER_PROFILE = /* GraphQL */ `
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      id
      displayName
      stats {
        totalCorrect
        totalWrong
        totalPoints
        setsPlayed
        setsWon
        currentStreak
        longestStreak
      }
    }
  }
`;

export const CHECK_DISPLAY_NAME_AVAILABLE = /* GraphQL */ `
  query CheckDisplayNameAvailable($displayName: String!) {
    checkDisplayNameAvailable(displayName: $displayName)
  }
`;

export const CHECK_EMAIL_HAS_GOOGLE_ACCOUNT = /* GraphQL */ `
  query CheckEmailHasGoogleAccount($email: String!) {
    checkEmailHasGoogleAccount(email: $email)
  }
`;

export const GET_LEADERBOARD = /* GraphQL */ `
  query GetLeaderboard($type: LeaderboardType!, $limit: Int) {
    getLeaderboard(type: $type, limit: $limit) {
      type
      entries {
        rank
        userId
        displayName
        score
      }
      updatedAt
    }
  }
`;

export const GET_MY_RANK = /* GraphQL */ `
  query GetMyRank($type: LeaderboardType!) {
    getMyRank(type: $type)
  }
`;

export const GET_GAME_STATE = /* GraphQL */ `
  query GetGameState {
    getGameState {
      isSetActive
      currentSetId
      nextSetTime
      playerCount
    }
  }
`;

export const GET_ABLY_TOKEN = /* GraphQL */ `
  query GetAblyToken {
    getAblyToken {
      token
      expires
    }
  }
`;

export const GET_CHAT_MESSAGES = /* GraphQL */ `
  query GetChatMessages($channelId: ID!, $limit: Int, $nextToken: String) {
    getChatMessages(
      channelId: $channelId
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        channelId
        senderId
        senderUsername
        senderDisplayName
        content
        createdAt
      }
      nextToken
    }
  }
`;

export const GET_MY_CONVERSATIONS = /* GraphQL */ `
  query GetMyConversations($limit: Int) {
    getMyConversations(limit: $limit) {
      id
      participantIds
      participants {
        id
        displayName
      }
      lastMessage {
        id
        content
        createdAt
        senderDisplayName
      }
      updatedAt
    }
  }
`;

export const GET_WEBHOOK_LOGS = /* GraphQL */ `
  query GetWebhookLogs($provider: String, $limit: Int, $nextToken: String) {
    getWebhookLogs(provider: $provider, limit: $limit, nextToken: $nextToken) {
      items {
        eventId
        provider
        eventType
        payload
        status
        errorMessage
        createdAt
      }
      nextToken
    }
  }
`;
