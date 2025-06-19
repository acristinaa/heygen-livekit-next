'use client';

import { useHeygenRoom } from '@/hooks/useHeygenRoom';
import { useState, useRef } from 'react';

export default function AvatarPage() {
  const { start, say, stop, setVideoEl } = useHeygenRoom();
  const [input, setInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex gap-2">
        <button onClick={() => start('Wayne_20240711')} className="btn-green">
          Start
        </button>
        <button onClick={stop} className="btn-red">
          Close
        </button>
      </div>

      <video ref={(el) => { setVideoEl(el!); videoRef.current = el!; }}
             autoPlay className="w-full rounded-xl border" />

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          className="flex-1 input"
        />
        <button onClick={() => { say(input, 'talk'); setInput(''); }}
                className="btn-green">
          Talk
        </button>
        <button onClick={() => { say(input, 'repeat'); setInput(''); }}
                className="btn-blue">
          Repeat
        </button>
      </div>
    </div>
  );
}
