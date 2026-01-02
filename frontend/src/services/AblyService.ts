import Ably from "ably";
import { getAblyToken } from "@/lib/api";

/**
 * Singleton service for managing Ably realtime connection
 * Handles connection lifecycle, token refresh, and channel management
 */
class AblyServiceClass {
  private ably: Ably.Realtime | null = null;
  private roomChannel: Ably.RealtimeChannel | null = null;
  private userChannel: Ably.RealtimeChannel | null = null;
  private currentPlayerId: string | null = null;
  private currentRoomId: string | null = null;
  private isInitializing = false;
  private refCount = 0;
  private latencyInterval: NodeJS.Timeout | null = null;

  /**
   * Fetch Ably token from AppSync Lambda
   */
  private async fetchToken() {
    try {
      return await getAblyToken();
    } catch (error) {
      console.error("Failed to fetch Ably token:", error);
      return null;
    }
  }

  /**
   * Initialize or reuse Ably connection
   */
  async connect(
    playerId: string,
    roomId: string,
  ): Promise<{
    roomChannel: Ably.RealtimeChannel;
    userChannel: Ably.RealtimeChannel;
  } | null> {
    // Already connected with same player and room
    if (
      this.ably?.connection.state === "connected" &&
      this.currentPlayerId === playerId &&
      this.currentRoomId === roomId &&
      this.roomChannel &&
      this.userChannel
    ) {
      this.refCount++;
      return {
        roomChannel: this.roomChannel,
        userChannel: this.userChannel,
      };
    }

    // Prevent concurrent initialization
    if (this.isInitializing) {
      return null;
    }

    this.isInitializing = true;
    this.currentPlayerId = playerId;
    this.currentRoomId = roomId;
    this.refCount++;

    try {
      const tokenData = await this.fetchToken();
      if (!tokenData) {
        throw new Error("Failed to get Ably token");
      }

      this.ably = new Ably.Realtime({
        token: tokenData.token,
        clientId: playerId,
        authCallback: async (_, callback) => {
          const newToken = await this.fetchToken();
          if (newToken) {
            callback(null, newToken.token);
          } else {
            callback("Failed to refresh Ably token", null);
          }
        },
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (this.ably!.connection.state === "connected") {
          resolve();
        } else {
          this.ably!.connection.once("connected", () => resolve());
          this.ably!.connection.once("failed", (err) => reject(err));
        }
      });

      // Create channels
      this.roomChannel = this.ably.channels.get(`quiz:room:${roomId}`);
      this.userChannel = this.ably.channels.get(`quiz:user:${playerId}`);

      this.isInitializing = false;

      return {
        roomChannel: this.roomChannel,
        userChannel: this.userChannel,
      };
    } catch (error) {
      console.error("Failed to initialize Ably:", error);
      this.isInitializing = false;
      this.currentPlayerId = null;
      this.currentRoomId = null;
      this.refCount--;
      return null;
    }
  }

  /**
   * Enter presence in room channel
   */
  async enterPresence(displayName: string): Promise<void> {
    if (!this.roomChannel) return;
    await this.roomChannel.presence.enter({ displayName });
  }

  /**
   * Leave presence in room channel
   */
  async leavePresence(): Promise<void> {
    if (!this.roomChannel) return;
    try {
      await this.roomChannel.presence.leave();
    } catch {
      // Ignore leave errors
    }
  }

  /**
   * Get current presence members
   */
  async getPresenceMembers(): Promise<Ably.PresenceMessage[]> {
    if (!this.roomChannel) return [];
    return await this.roomChannel.presence.get();
  }

  /**
   * Publish message to room channel
   */
  async publishToRoom(event: string, data: unknown): Promise<void> {
    if (!this.roomChannel) return;
    await this.roomChannel.publish(event, data);
  }

  /**
   * Start latency measurement interval
   */
  startLatencyMeasurement(onLatency: (latency: number) => void): void {
    if (this.latencyInterval) return;

    const measure = () => {
      if (!this.roomChannel) return;
      const start = Date.now();
      this.roomChannel
        .publish("latency_ping", { timestamp: start })
        .then(() => {
          onLatency(Date.now() - start);
        })
        .catch(() => {
          // Ignore latency errors
        });
    };

    measure();
    this.latencyInterval = setInterval(measure, 5000);
  }

  /**
   * Stop latency measurement
   */
  stopLatencyMeasurement(): void {
    if (this.latencyInterval) {
      clearInterval(this.latencyInterval);
      this.latencyInterval = null;
    }
  }

  /**
   * Get the room channel for subscriptions
   */
  getRoomChannel(): Ably.RealtimeChannel | null {
    return this.roomChannel;
  }

  /**
   * Get the user channel for subscriptions
   */
  getUserChannel(): Ably.RealtimeChannel | null {
    return this.userChannel;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ably?.connection.state === "connected";
  }

  /**
   * Decrement ref count and cleanup if needed
   */
  release(): void {
    this.refCount--;

    if (this.refCount === 0) {
      // Delay cleanup for React Strict Mode
      setTimeout(() => {
        if (this.refCount === 0) {
          this.disconnect();
        }
      }, 100);
    }
  }

  /**
   * Force disconnect
   */
  disconnect(): void {
    this.stopLatencyMeasurement();

    if (this.roomChannel) {
      try {
        // Only leave presence if channel is still attached
        if (this.roomChannel.state === "attached") {
          this.roomChannel.presence.leave().catch(() => {
            // Ignore leave errors
          });
        }
        // Only unsubscribe if channel is not detached/failed
        if (
          this.roomChannel.state !== "detached" &&
          this.roomChannel.state !== "failed"
        ) {
          this.roomChannel.unsubscribe();
        }
      } catch {
        // Ignore cleanup errors
      }
      this.roomChannel = null;
    }

    if (this.userChannel) {
      try {
        if (
          this.userChannel.state !== "detached" &&
          this.userChannel.state !== "failed"
        ) {
          this.userChannel.unsubscribe();
        }
      } catch {
        // Ignore cleanup errors
      }
      this.userChannel = null;
    }

    if (this.ably) {
      this.ably.close();
      this.ably = null;
    }

    this.currentPlayerId = null;
    this.currentRoomId = null;
    this.refCount = 0;
  }
}

// Export singleton instance
export const AblyService = new AblyServiceClass();
