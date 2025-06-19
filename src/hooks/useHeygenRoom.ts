import { useRef, useState, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  VideoPresets,
  RemoteTrack,
} from 'livekit-client';

interface HeygenSession {
  session_id: string;
  url: string;
  access_token: string;
}

export function useHeygenRoom() {
  const roomRef              = useRef<Room | null>(null);
  const sessionIdRef         = useRef<string | null>(null);
  const tokenRef             = useRef<string | null>(null);
  const mediaStream          = useRef(new MediaStream());
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  async function start(avatarId: string, voiceId?: string) {
    const { token } = await fetch('/api/heygen', {
      method: 'POST',
      body: JSON.stringify({ op: 'token' }),
    }).then(r => r.json());
    tokenRef.current = token;

    const session: HeygenSession = await fetch('/api/heygen', {
      method: 'POST',
      body: JSON.stringify({
        op:        'new',
        token,
        avatar_id: avatarId,
        voice_id:  voiceId,
        version:   'v2',
      }),
    }).then(r => r.json());
    sessionIdRef.current = session.session_id;

    const room = new Room({
      adaptiveStream: true,
      videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
    });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      mediaStream.current.addTrack(track.mediaStreamTrack);
      if (videoEl) videoEl.srcObject = mediaStream.current;
    });

    await room.prepareConnection(session.url, session.access_token);

    await fetch('/api/heygen', {
      method: 'POST',
      body: JSON.stringify({
        op:         'start',
        token,
        session_id: session.session_id,
      }),
    });

    await room.connect(session.url, session.access_token);
  }

  async function say(text: string, mode: 'talk' | 'repeat' = 'talk') {
    if (!sessionIdRef.current || !tokenRef.current || !text.trim()) return;
    await fetch('/api/heygen', {
      method: 'POST',
      body: JSON.stringify({
        op:         'task',
        token:      tokenRef.current,
        session_id: sessionIdRef.current,
        text,
        action:     mode,
      }),
    });
  }

  async function stop() {
    if (sessionIdRef.current && tokenRef.current) {
      await fetch('/api/heygen', {
        method: 'POST',
        body: JSON.stringify({
          op:         'stop',
          token:      tokenRef.current,
          session_id: sessionIdRef.current,
        }),
      });
    }
    roomRef.current?.disconnect();
    roomRef.current = null;
    sessionIdRef.current = null;
    tokenRef.current = null;
    mediaStream.current.getTracks().forEach(t => t.stop());
    if (videoEl) videoEl.srcObject = null;
  }

  useEffect(() => () => { stop(); });

  return { start, say, stop, setVideoEl };
}
