"use client";

import { FileUp, Calendar as CalIcon, MessageSquare } from "lucide-react";

export default function ClientDashboard() {
  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-12">
        <h1 className="font-display text-4xl font-bold mb-2">Welcome back, Client</h1>
        <p className="text-[var(--text-faint)]">Here is your session overview and secure vault.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Sessions Tracker */}
        <div className="lg:col-span-2 dash-card">
          <div className="flex justify-between items-center mb-6 border-b border-[var(--border)] pb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <CalIcon size={18} className="text-[var(--color-primary)]" />
              Upcoming Sessions
            </h2>
            <button className="text-xs bg-[var(--color-primary-pale)] text-[var(--color-primary)] px-3 py-1.5 rounded-full font-bold">
              Book New
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] flex justify-between items-center">
              <div>
                <div className="font-bold mb-1">Architecture Review</div>
                <div className="text-xs text-[var(--text-faint)] font-mono-sos">Oct 24, 2026 • 10:00 AM</div>
              </div>
              <button className="btn-sos py-2 px-4 text-[11px]">Join Video Call</button>
            </div>
            
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-base)] flex justify-between items-center opacity-50">
              <div>
                <div className="font-bold mb-1">Initial Consultation</div>
                <div className="text-xs text-[var(--text-faint)] font-mono-sos">Completed</div>
              </div>
              <span className="text-xs font-bold text-[var(--color-teal)]">Done</span>
            </div>
          </div>
        </div>

        {/* Chat / Messages Preview */}
        <div className="dash-card flex flex-col">
          <h2 className="font-bold text-lg flex items-center gap-2 mb-6 border-b border-[var(--border)] pb-4">
            <MessageSquare size={18} className="text-[var(--color-gold)]" />
            Expert Messages
          </h2>
          
          <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
            <div className="chat-bubble theirs">
              Please upload the latest blueprints to the vault before our next session.
            </div>
            <div className="chat-bubble mine">
              Will do, thanks!
            </div>
          </div>
          
          <div className="mt-auto flex gap-2">
            <input type="text" placeholder="Type a message..." className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]" />
            <button className="bg-[var(--color-primary)] text-white px-3 py-2 rounded-lg text-sm font-bold">Send</button>
          </div>
        </div>
      </div>

      {/* Secure Vault */}
      <div className="dash-card">
        <h2 className="font-bold text-lg mb-6 border-b border-[var(--border)] pb-4">Secure Vault</h2>
        <div className="vault-dropzone">
          <FileUp size={32} className="mx-auto mb-4 text-[var(--text-faint)]" />
          <p className="font-bold mb-1">Drag & Drop files here</p>
          <p className="text-sm text-[var(--text-faint)]">or click to browse. Max size 50MB.</p>
        </div>
        
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-3 text-[var(--text-muted)]">Uploaded Files</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border border-[var(--border)] rounded-lg flex items-center gap-3 bg-[var(--bg-base)] hover:border-[var(--color-pink)] transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded bg-[var(--color-primary-pale)] flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">PDF</div>
              <div className="truncate text-sm font-semibold">Project_Brief.pdf</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
