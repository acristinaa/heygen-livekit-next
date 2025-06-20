import {
    Room,
    RoomEvent,
    VideoPresets,
    RemoteTrack,
    setLogLevel,
    LogLevel,
  } from "livekit-client";
  import { useRef, useState, useEffect, useCallback } from "react";
  
  setLogLevel(LogLevel.warn);
  
  interface HeygenSession {
    session_id: string;
    url: string;
    access_token: string;
  }
  
  export function useHeygenRoom() {
    const roomRef      = useRef<Room | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const tokenRef     = useRef<string | null>(null);
    const mediaStream  = useRef<MediaStream | null>(null);
  
    const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  
    const stop = useCallback(async () => {
      try {
        if (sessionIdRef.current && tokenRef.current) {
          await fetch("/api/heygen", {
            method: "POST",
            body: JSON.stringify({
              op: "stop",
              token: tokenRef.current,
              session_id: sessionIdRef.current,
            }),
          });
        }
      } catch {
      }
  
      roomRef.current?.disconnect();
      roomRef.current = null;
      sessionIdRef.current = null;
      tokenRef.current = null;
  
      if (mediaStream.current) {
        mediaStream.current.getTracks().forEach((t) => t.stop());
        mediaStream.current = null;
      }
      if (videoEl) videoEl.srcObject = null;
    }, [videoEl]);
  
    async function start(avatarId: string, voiceId?: string) {
      try {
        /* 1️⃣ token */
        const { token } = await fetch("/api/heygen", {
          method: "POST",
          body: JSON.stringify({ op: "token" }),
        }).then((r) => r.json());
        tokenRef.current = token;
  
        /* 2️⃣ session */
        const session: HeygenSession = await fetch("/api/heygen", {
          method: "POST",
          body: JSON.stringify({
            op: "new",
            token,
            avatar_id: avatarId,
            voice_id: voiceId,
            version: "v2",
          }),
        }).then((r) => r.json());
        sessionIdRef.current = session.session_id;
  
        /* 3️⃣ room */
        const room = new Room({
          adaptiveStream: true,
          videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
        });
        roomRef.current = room;
  
        /* —— track handlers —— */
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          console.log("[LiveKit] subscribed:", track.kind);
  
          if (!mediaStream.current) {
            mediaStream.current = new MediaStream();
            if (videoEl) videoEl.srcObject = mediaStream.current;
          }
  
          if (track.mediaStreamTrack) {
            mediaStream.current.addTrack(track.mediaStreamTrack);
          }
  
          // ensure audio is audible
          if (track.kind === "audio" && videoEl) {
            videoEl.muted = false;
            videoEl.volume = 1.0;
            videoEl.play().catch(() => {});
          }
        });
  
        room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          console.log("[LiveKit] unsubscribed:", track.kind);
  
          if (
            mediaStream.current &&
            track.mediaStreamTrack &&
            mediaStream.current.getTracks().includes(track.mediaStreamTrack)
          ) {
            mediaStream.current.removeTrack(track.mediaStreamTrack);
          }
        });
  
        await room.prepareConnection(session.url, session.access_token);
  
        /* 4️⃣ start publishing */
        const startRes = await fetch("/api/heygen", {
          method: "POST",
          body: JSON.stringify({
            op: "start",
            session_id: session.session_id,
            token,
          }),
        });
        const txt = await startRes.text();
        console.log("[HeyGen] start response:", txt);
        if (!startRes.ok) throw new Error(txt);
  
        /* 5️⃣ connect to LiveKit */
        await room.connect(session.url, session.access_token);
  
        if (videoEl) {
          videoEl.muted = false;
          videoEl.volume = 1.0;
          await videoEl.play().catch(() => {});
        }
      } catch (err) {
        console.error("[HeyGen] start() error:", err);
        await stop();
        throw err;
      }
    }
  
    async function say(text: string, mode: "talk" | "repeat" = "talk") {
      if (!sessionIdRef.current || !tokenRef.current || !text.trim()) return;
  
      await fetch("/api/heygen", {
        method: "POST",
        body: JSON.stringify({
          op: "task",
          token: tokenRef.current,
          session_id: sessionIdRef.current,
          text,
          action: mode,
        }),
      });
    }
  
    useEffect(() => {
      return () => {
        stop();
      };
    }, [stop]);
  
    return { start, say, stop, setVideoEl };
  }
  