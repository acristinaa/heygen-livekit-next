"use client";

import type React from "react";

import { useHeygenRoom } from "@/hooks/useHeygenRoom";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Square, MessageCircle, Repeat } from "lucide-react";
import { askLLM } from "@/lib/ask-llm";

export default function AvatarPage() {
  const { start, say, stop, setVideoEl } = useHeygenRoom();
  const [input, setInput] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStart = async () => {
    await start("Wayne_20240711", "GERMAN_VOICE_ID_HERE");
    setIsSessionActive(true);
  };

  const handleStop = async () => {
    await stop();
    setIsSessionActive(false);
  };

  const handleAsk = async () => {
    if (!input.trim()) return;
    const reply = await askLLM(input);
    say(reply, "talk");          // avatar speaks the LLM’s answer
    setInput("");                // clear input
  };
  

  const handleRepeat = () => {
    if (input.trim()) {
      say(input, "repeat");
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAsk();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            AI Avatar Studio
          </h1>
          <p className="text-slate-600 text-lg">
            Interagiere mit deinem KI-Avatar in Echtzeit
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Control Buttons */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleStart}
                  disabled={isSessionActive}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-lg font-medium"
                  size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  Starten
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={!isSessionActive}
                  variant="destructive"
                  className="px-6 py-3 text-lg font-medium"
                  size="lg">
                  <Square className="w-5 h-5 mr-2" />
                  Beenden
                </Button>
              </div>
              {isSessionActive && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                    Session aktiv
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Video Display */}
          <Card className="shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="relative bg-slate-900 aspect-video">
                <video
                  ref={(el) => {
                    setVideoEl(el!);
                    videoRef.current = el!;
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {!isSessionActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                    <div className="text-center text-white">
                      <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Starte eine Session</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Was möchtest du den Avatar fragen?"
                    className="flex-1 text-lg py-3 px-4 border-2 border-slate-200 focus:border-blue-500 rounded-lg"
                    disabled={!isSessionActive}
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={handleAsk}
                    disabled={!isSessionActive || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium"
                    size="lg">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Frage stellen
                  </Button>
                  <Button
                    onClick={handleRepeat}
                    disabled={!isSessionActive || !input.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 font-medium"
                    size="lg">
                    <Repeat className="w-5 h-5 mr-2" />
                    Wiederholen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500">
          <p>Powered by HeyGen AI Avatar Technology</p>
        </div>
      </div>
    </div>
  );
}
