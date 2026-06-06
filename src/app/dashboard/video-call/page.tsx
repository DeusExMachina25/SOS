"use client";

import { JitsiMeeting } from "@jitsi/react-sdk";
import { useState } from "react";

export default function VideoCallPage() {
  const [isJoined, setIsJoined] = useState(false);

  // In a real app, this would be generated uniquely per session
  const roomName = "SOS-Architecture-Review-882934";

  return (
    <div className="h-[80vh] bg-[var(--bg-base)] rounded-3xl overflow-hidden border border-[var(--border)] flex flex-col">
      <header className="p-4 border-b border-[var(--border)] bg-[var(--bg-surface)] flex justify-between items-center z-10 relative">
        <div>
          <h1 className="font-bold">Architecture Review Session</h1>
          <p className="text-xs text-[var(--text-faint)]">Secured by Jitsi Meet (End-to-End Encrypted)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isJoined ? 'bg-red-500 animate-pulse' : 'bg-[var(--color-primary)]'}`}></span>
          <span className={`text-xs font-bold ${isJoined ? 'text-red-500' : 'text-[var(--text-faint)]'}`}>
            {isJoined ? 'Live' : 'Waiting'}
          </span>
        </div>
      </header>
      
      <div className="flex-1 relative w-full h-full bg-[#1A0030]">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: true,
            enableEmailInStats: false,
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
          }}
          userInfo={{
            displayName: 'Client User'
          }}
          onApiReady={(externalApi) => {
            // Can attach event listeners to the Jitsi API here
            externalApi.addListener('videoConferenceJoined', () => setIsJoined(true));
            externalApi.addListener('videoConferenceLeft', () => setIsJoined(false));
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
            iframeRef.style.border = 'none';
          }}
        />
      </div>
    </div>
  );
}
