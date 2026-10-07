"use client";

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function VideoCallContent() {
  const searchParams = useSearchParams();

  const sessionId = searchParams.get("sessionId");
  const sessionName = searchParams.get("sessionName") || "Consultation";

  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    async function fetchToken() {
      try {
        const res = await fetch(
          `/api/livekit-token?sessionId=${encodeURIComponent(sessionId!)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "Could not join this session");
        }
        if (active) setToken(data.token);
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "An unknown error occurred");
        }
      }
    }

    fetchToken();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!sessionId) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-center p-8">
        <p className="text-xs text-[var(--text-muted)] font-mono-sos uppercase tracking-widest">
          Open a session from your dashboard to join its call.
        </p>
      </div>
    );
  }

  if (!livekitUrl) {
    return (
      <div className="h-[80vh] bg-[var(--bg-base)] rounded-3xl overflow-hidden border border-[var(--border)] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-400 font-mono-sos text-sm mb-4">CONFIGURATION ERROR</p>
        <p className="text-xs text-[var(--text-muted)] max-w-md">
          NEXT_PUBLIC_LIVEKIT_URL is not configured in your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[80vh] bg-[var(--bg-base)] rounded-3xl overflow-hidden border border-[var(--border)] flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
      <header className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)] backdrop-blur-md flex justify-between items-center z-10 relative">
        <div>
          <h1 className="font-bold text-lg">{sessionName}</h1>
          <p className="text-xs text-[var(--text-faint)]">
            Private room · only you and your counterpart can join
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              token ? "bg-red-500 animate-pulse" : "bg-[var(--color-primary)]"
            }`}
          ></span>
          <span
            className={`text-xs font-bold ${
              token ? "text-red-500" : "text-[var(--text-faint)]"
            }`}
          >
            {token ? "Live" : "Connecting"}
          </span>
        </div>
      </header>

      <div className="flex-1 relative w-full h-full bg-[var(--bg-base)] overflow-hidden">
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-base)]">
            <p className="text-red-400 font-mono-sos text-sm mb-4">CONNECTION ERROR</p>
            <p className="text-xs text-[var(--text-muted)] max-w-md">{error}</p>
          </div>
        )}
        {!error && !token && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-base)]">
            <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xs text-[var(--text-faint)] font-mono-sos animate-pulse">
              GENERATING SECURE TOKEN...
            </p>
          </div>
        )}
        {!error && token && (
          <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={livekitUrl}
            data-lk-theme="default"
            style={{ height: "100%", width: "100%" }}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-[var(--text-muted)] animate-pulse font-mono-sos text-xs">
          INITIALIZING SECURE CONNECTION...
        </div>
      }
    >
      <VideoCallContent />
    </Suspense>
  );
}
