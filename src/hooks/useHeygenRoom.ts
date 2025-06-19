import { useRef, useState, useEffect } from "react";
import { Room, RoomEvent, VideoPresets, RemoteTrack } from "livekit-client";

interface HeygenSession {
  session_id: string;
  url: string;
  access_token: string;
}

export function useHeygenRoom() {
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  async function start(avatarId: string, voiceId?: string) {
    try {
      console.log("[HeyGen] Starting session with avatar:", avatarId, "voice:", voiceId);
      
      // 1️⃣ Get session token
      console.log("[HeyGen] Fetching session token...");
      const tokenResponse = await fetch("/api/heygen", {
        method: "POST",
        body: JSON.stringify({ op: "token" }),
      });
      
      if (!tokenResponse.ok) {
        const errorMsg = await tokenResponse.text();
        console.error("[HeyGen] Failed to get token:", errorMsg);
        throw new Error(`Failed to get token: ${errorMsg}`);
      }
      
      const { token } = await tokenResponse.json();
      tokenRef.current = token;
      console.log("[HeyGen] Token received successfully");

      // 2️⃣ Create session
      console.log("[HeyGen] Creating new session...");
      const sessionResponse = await fetch("/api/heygen", {
        method: "POST",
        body: JSON.stringify({
          op: "new",
          token,
          avatar_id: avatarId,
          voice_id: voiceId,
          version: "v2",
        }),
      });
      
      if (!sessionResponse.ok) {
        const errorMsg = await sessionResponse.text();
        console.error("[HeyGen] Failed to create session:", errorMsg);
        throw new Error(`Failed to create session: ${errorMsg}`);
      }
      
      const session: HeygenSession = await sessionResponse.json();
      sessionIdRef.current = session.session_id;
      console.log("[HeyGen] Session created:", session.session_id);

      // 3️⃣ Setup LiveKit
      console.log("[LiveKit] Setting up room...");
      const room = new Room({
        adaptiveStream: true,
        videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        console.log("[LiveKit] Track subscribed:", track.kind);
        if (!mediaStream.current) {
          mediaStream.current = new MediaStream();
          if (videoEl) {
            videoEl.srcObject = mediaStream.current;
            console.log("[LiveKit] Video element connected to media stream");
          }
        }

        const mst = track.mediaStreamTrack;
        if (mst) {
          mediaStream.current.addTrack(mst);
          console.log("[LiveKit] Track added to media stream:", track.kind);
        }
      });

      room.on(RoomEvent.Connected, () => {
        console.log("[LiveKit] Successfully connected to room");
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKit] Disconnected from room");
      });

      await room.prepareConnection(session.url, session.access_token);
      console.log("[LiveKit] Connection prepared");

      // 4️⃣ Tell HeyGen to start
      console.log("[HeyGen] Starting streaming...");
      const startRes = await fetch("/api/heygen", {
        method: "POST",
        body: JSON.stringify({
          op: "start",
          session_id: session.session_id,
          token: tokenRef.current,
        }),
      });

      if (!startRes.ok) {
        const msg = await startRes.text();
        console.error("[HeyGen] Failed to start streaming:", msg);
        throw new Error(`Failed to start streaming: ${msg}`);
      }

      console.log("[HeyGen] Streaming started successfully");
      console.log("[LiveKit] Connecting to:", session.url);

      await room.connect(session.url, session.access_token);
      console.log("[HeyGen] Session started successfully");
      
    } catch (error) {
      console.error("[HeyGen] Error starting session:", error);
      await stop(); // Clean up on error
      throw error;
    }
  }

  async function say(text: string, mode: "talk" | "repeat" = "talk") {
    if (!sessionIdRef.current || !tokenRef.current || !text.trim()) {
      console.warn("[HeyGen] Cannot say text - missing session, token, or empty text");
      return;
    }
    
    try {
      console.log(`[HeyGen] Sending ${mode} request:`, text);
      const response = await fetch("/api/heygen", {
        method: "POST",
        body: JSON.stringify({
          op: "task",
          token: tokenRef.current,
          session_id: sessionIdRef.current,
          text,
          action: mode,
        }),
      });
      
      if (!response.ok) {
        const errorMsg = await response.text();
        console.error(`[HeyGen] Failed to send ${mode} request:`, errorMsg);
        throw new Error(`Failed to send ${mode} request: ${errorMsg}`);
      }
      
      console.log(`[HeyGen] ${mode} request sent successfully`);
    } catch (error) {
      console.error(`[HeyGen] Error sending ${mode} request:`, error);
      throw error;
    }
  }

  async function stop() {
    console.log("[HeyGen] Stopping session...");
    
    try {
      if (sessionIdRef.current && tokenRef.current) {
        console.log("[HeyGen] Sending stop request to API...");
        const response = await fetch("/api/heygen", {
          method: "POST",
          body: JSON.stringify({
            op: "stop",
            token: tokenRef.current,
            session_id: sessionIdRef.current,
          }),
        });
        
        if (!response.ok) {
          const errorMsg = await response.text();
          console.error("[HeyGen] Failed to stop session:", errorMsg);
        } else {
          console.log("[HeyGen] Session stopped successfully");
        }
      }

      if (roomRef.current) {
        console.log("[LiveKit] Disconnecting room...");
        roomRef.current.disconnect();
        roomRef.current = null;
      }

      sessionIdRef.current = null;
      tokenRef.current = null;

      if (mediaStream.current) {
        console.log("[LiveKit] Stopping media stream tracks...");
        mediaStream.current.getTracks().forEach((t) => t.stop());
        mediaStream.current = null;
      }

      if (videoEl) {
        videoEl.srcObject = null;
        console.log("[LiveKit] Video element cleared");
      }
      
      console.log("[HeyGen] Session cleanup completed");
    } catch (error) {
      console.error("[HeyGen] Error during stop:", error);
    }
  }

  useEffect(() => {
    return () => {
      console.log("[HeyGen] Component unmounting, cleaning up...");
      
      // Inline cleanup instead of calling stop()
      if (sessionIdRef.current && tokenRef.current) {
        fetch("/api/heygen", {
          method: "POST",
          body: JSON.stringify({
            op: "stop",
            token: tokenRef.current,
            session_id: sessionIdRef.current,
          }),
        });
      }
      
      roomRef.current?.disconnect();
      mediaStream.current?.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, [videoEl]);

  return { start, say, stop, setVideoEl };
}
