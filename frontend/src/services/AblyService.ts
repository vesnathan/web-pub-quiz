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
  private boundBeforeUnload: (() => void) | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private visibilityTimeout: NodeJS.Timeout | null = null;
  private boundIdleReset: (() => void) | null = null;
  private boundVisibilityChange: (() => void) | null = null;
  private readonly IDLE_MS = 10 * 60 * 1000; // 10 min idle = disconnect
  private readonly HIDDEN_TAB_MS = 10 * 60 * 1000; // 10 min hidden tab = disconnect
  private disconnectCallbacks: Set<(reason: string) => void> = new Set();

  /**
   * Handle page unload - leave presence before closing
   */
  private handleBeforeUnload = () => {
    if (this.roomChannel) {
      try {
        // Synchronous leave for reliability on page unload
        this.roomChannel.presence.leave();
      } catch {
        // Ignore errors during unload
      }
    }
  };

  /**
   * Register a callback to be notified when disconnected
   */
  onDisconnect(callback: (reason: string) => void): () => void {
    this.disconnectCallbacks.add(callback);
    return () => this.disconnectCallbacks.delete(callback);
  }

  /**
   * Notify all disconnect callbacks
   */
  private notifyDisconnect(reason: string): void {
    this.disconnectCallbacks.forEach((cb) => cb(reason));
  }

  /**
   * Reset idle timer on user activity
   */
  private resetIdleTimer = () => {
    if (this.idleTimeout) clearTimeout(this.idleTimeout);
    this.idleTimeout = setTimeout(() => {
      console.log("[AblyService] Disconnecting idle user");
      this.notifyDisconnect("idle");
      this.disconnect();
    }, this.IDLE_MS);
  };

  /**
   * Handle visibility change - disconnect after extended hidden period
   */
  private handleVisibilityChange = () => {
    if (document.hidden) {
      this.visibilityTimeout = setTimeout(() => {
        console.log("[AblyService] Disconnecting due to hidden tab");
        this.notifyDisconnect("hidden_tab");
        this.disconnect();
      }, this.HIDDEN_TAB_MS);
    } else {
      if (this.visibilityTimeout) {
        clearTimeout(this.visibilityTimeout);
        this.visibilityTimeout = null;
      }
      this.resetIdleTimer();
    }
  };

  /**
   * Setup idle detection listeners
   */
  private setupIdleDetection(): void {
    if (typeof window === "undefined") return;

    this.boundIdleReset = this.resetIdleTimer;
    this.boundVisibilityChange = this.handleVisibilityChange;

    ["mousedown", "keydown", "touchstart", "scroll"].forEach((event) => {
      window.addEventListener(event, this.boundIdleReset!, { passive: true });
    });

    document.addEventListener("visibilitychange", this.boundVisibilityChange);

    this.resetIdleTimer();
  }

  /**
   * Cleanup idle detection listeners
   */
  private cleanupIdleDetection(): void {
    if (typeof window === "undefined") return;

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
      this.visibilityTimeout = null;
    }

    if (this.boundIdleReset) {
      ["mousedown", "keydown", "touchstart", "scroll"].forEach((event) => {
        window.removeEventListener(event, this.boundIdleReset!);
      });
      this.boundIdleReset = null;
    }

    if (this.boundVisibilityChange) {
      document.removeEventListener(
        "visibilitychange",
        this.boundVisibilityChange,
      );
      this.boundVisibilityChange = null;
    }
  }

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
      // Check if this is a guest user (playerId starts with "guest-")
      const isGuest = playerId.startsWith("guest-");
      console.log(
        `[AblyService] Connecting as ${isGuest ? "guest" : "authenticated"} user: ${playerId}`,
      );

      if (isGuest) {
        // Guests use the public Ably key directly (same as lobby)
        const ablyKey = process.env.NEXT_PUBLIC_ABLY_KEY;
        console.log(
          `[AblyService] Guest using public key: ${ablyKey ? "key found" : "KEY MISSING!"}`,
        );
        if (!ablyKey) {
          throw new Error("NEXT_PUBLIC_ABLY_KEY not configured");
        }

        this.ably = new Ably.Realtime({
          key: ablyKey,
          clientId: playerId,
        });
        console.log("[AblyService] Guest Ably instance created");
      } else {
        // Authenticated users get a token from the backend
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
      }

      // Wait for connection
      console.log(
        `[AblyService] Waiting for connection... current state: ${this.ably!.connection.state}`,
      );
      await new Promise<void>((resolve, reject) => {
        if (this.ably!.connection.state === "connected") {
          console.log("[AblyService] Already connected");
          resolve();
        } else {
          this.ably!.connection.once("connected", () => {
            console.log("[AblyService] Connection established");
            resolve();
          });
          this.ably!.connection.once("failed", (err) => {
            console.error("[AblyService] Connection failed:", err);
            reject(err);
          });
        }
      });

      // Monitor connection state changes
      this.ably.connection.on("disconnected", () => {
        console.log("[AblyService] Connection disconnected");
      });
      this.ably.connection.on("suspended", () => {
        console.log("[AblyService] Connection suspended");
        this.notifyDisconnect("connection_lost");
      });
      this.ably.connection.on("failed", () => {
        console.log("[AblyService] Connection failed");
        this.notifyDisconnect("connection_failed");
      });
      this.ably.connection.on("closed", () => {
        console.log("[AblyService] Connection closed");
      });

      // Create channels
      this.roomChannel = this.ably.channels.get(`quiz:room:${roomId}`);
      this.userChannel = this.ably.channels.get(`quiz:user:${playerId}`);

      // Add beforeunload handler to leave presence on page close/refresh
      if (typeof window !== "undefined" && !this.boundBeforeUnload) {
        this.boundBeforeUnload = this.handleBeforeUnload;
        window.addEventListener("beforeunload", this.boundBeforeUnload);
      }

      // Setup idle detection to disconnect inactive users
      this.setupIdleDetection();

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
  async enterPresence(displayName: string): Promise<boolean> {
    if (!this.roomChannel) {
      console.error("[AblyService] Cannot enter presence: no room channel");
      return false;
    }

    console.log(
      `[AblyService] Attempting to enter presence as "${displayName}" in ${this.roomChannel.name}`,
    );
    console.log(`[AblyService] Room channel state: ${this.roomChannel.state}`);

    try {
      await this.roomChannel.presence.enter({ displayName });
      console.log(
        `[AblyService] Successfully entered presence in ${this.roomChannel.name} as ${displayName}`,
      );
      return true;
    } catch (error) {
      console.error("[AblyService] Failed to enter presence:", error);
      return false;
    }
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
    this.cleanupIdleDetection();

    // Remove beforeunload handler
    if (typeof window !== "undefined" && this.boundBeforeUnload) {
      window.removeEventListener("beforeunload", this.boundBeforeUnload);
      this.boundBeforeUnload = null;
    }

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
