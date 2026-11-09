"use client";

import { FileUp, FolderLock, Search, Download, Trash2, FileText, Image as ImageIcon, Archive, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  getMyVaultFiles,
  uploadVaultFile,
  deleteVaultFile,
  getVaultFileUrl,
  getMySessions,
  getCurrentUserId,
} from "@/lib/data/queries";
import { formatFileSize, fileKindOf } from "@/lib/data/format";
import type { VaultFile, Session } from "@/lib/data/types";
import MagneticDropZone from "./MagneticDropZone";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const MAX_BYTES = 50 * 1024 * 1024;

export default function VaultWorkspace({ role }: { role: "client" | "expert" }) {
  const [activeTab, setActiveTab] = useState("All Files");
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // "2 of 3" while a batch of files uploads; null when idle.
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getMyVaultFiles(), getMySessions(), getCurrentUserId()])
      .then(([vaultFiles, mySessions, currentUserId]) => {
        setFiles(vaultFiles);
        setSessions(mySessions);
        setUserId(currentUserId);
        if (mySessions.length > 0) setSelectedSessionId(mySessions[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load vault"))
      .finally(() => setLoading(false));
  }, []);

  const handlePickFile = () => {
    if (!selectedSessionId) {
      setError(role === "client" ? "Book a session before uploading — files are attached to a session." : "No consultations yet — files are attached to a session.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = "";
    uploadFiles(chosen);
  };

  // Shared by the file picker and drag-and-drop. Uploads one at a time so a failure names the file.
  const uploadFiles = async (chosen: File[]) => {
    if (chosen.length === 0) return;
    if (!selectedSessionId) {
      handlePickFile(); // shows the "book a session first" message
      return;
    }
    const tooBig = chosen.filter((f) => f.size > MAX_BYTES);
    const ok = chosen.filter((f) => f.size <= MAX_BYTES);
    setError(tooBig.length ? `${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over 50MB and wasn't uploaded.` : "");
    if (ok.length === 0) return;

    setUploading({ done: 0, total: ok.length });
    for (let i = 0; i < ok.length; i++) {
      try {
        const uploaded = await uploadVaultFile(selectedSessionId, ok[i]);
        setFiles((prev) => [uploaded, ...prev]);
      } catch (err) {
        setError(`${ok[i].name}: ${err instanceof Error ? err.message : "Upload failed"}`);
      }
      setUploading({ done: i + 1, total: ok.length });
    }
    setUploading(null);
  };

  const handleDeleteFile = async (file: VaultFile) => {
    const ok = await confirm({
      title: `Delete ${file.name}?`,
      message: "It is removed from the vault for you and your expert.",
      action: "Delete",
    });
    if (!ok) return;
    try {
      await deleteVaultFile(file.id, file.storagePath);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      const url = await getVaultFileUrl(file.storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate download link");
    }
  };

  const getFileIcon = (mimeType: string | null, name: string) => {
    switch (fileKindOf(mimeType, name)) {
      case 'pdf': return <FileText size={24} className="text-red-400" />;
      case 'image': return <ImageIcon size={24} className="text-[var(--color-primary)]" />;
      case 'archive': return <Archive size={24} className="text-yellow-400" />;
      default: return <FileText size={24} className="text-[var(--text-muted)]" />;
    }
  };

  // Filter based on tab and search
  const filteredFiles = files.filter(file => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.uploaderName.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "My Uploads") {
      return matchesSearch && file.uploadedBy === userId;
    }
    if (activeTab === "Shared with Me") {
      return matchesSearch && file.uploadedBy !== userId;
    }
    return matchesSearch;
  });

  return (
    <div className="w-full relative flex flex-col">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] flex items-center gap-4">
            <FolderLock size={32} className="text-[var(--color-green)]" /> Secure Vault
          </h1>
          <p className="font-mono-sos text-sm text-[var(--text-muted)] mt-3 tracking-widest uppercase">Encrypted File Storage</p>
        </div>
        <div className="flex gap-4 items-start w-full md:w-auto">
          {sessions.length > 0 && (
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-full px-4 py-3 text-xs font-mono-sos uppercase tracking-widest outline-none focus:border-[var(--color-green)] text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Session new uploads attach to"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.title} — {s.date}</option>
              ))}
            </select>
          )}
          <div className="relative w-64 hidden md:block">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--color-green)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
        </div>
      </header>

      {error && (
        <p className="text-sm text-[var(--color-orange)] font-mono-sos mb-8">{error}</p>
      )}

      {/* DROPZONE */}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChosen} />
      <MagneticDropZone
        onClick={handlePickFile}
        onFiles={uploadFiles}
        disabled={uploading !== null}
        icon={
          uploading ? (
            <Loader2 size={32} className="text-[var(--color-green)] animate-spin" />
          ) : (
            <FileUp size={32} className="text-[var(--text-muted)] group-hover:text-[var(--color-green)] transition-colors" />
          )
        }
        title={uploading ? (uploading.total > 1 ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : "Uploading…") : "Upload to Vault"}
        hint={
          sessions.length > 0
            ? `Drag files here, or click to choose, for the selected ${role === "client" ? "session" : "consultation"}.`
            : role === "client"
              ? "Book a session first — files attach to a session."
              : "No consultations yet — files attach to a session."
        }
      >
        <div className="flex gap-4 text-xs font-mono-sos text-[var(--text-faint)] tracking-widest pointer-events-none">
          <span className="bg-[var(--bg-base)] px-4 py-2 rounded-full border border-[var(--border)]">MAX 50MB</span>
          <span className="bg-[var(--bg-base)] px-4 py-2 rounded-full border border-[var(--border)] text-[var(--color-green)]/70">PRIVATE STORAGE</span>
        </div>
      </MagneticDropZone>

      {/* TABS */}
      <div className="flex gap-8 mb-8 border-b border-[var(--border)]">
        {["All Files", "Shared with Me", "My Uploads"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === tab
                ? "text-[var(--text-primary)] border-[var(--color-green)]"
                : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILE LIST */}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">Loading vault…</p>
      ) : filteredFiles.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] font-mono-sos">No files yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFiles.map((file) => (
            <div key={file.id} className="glass-panel p-6 rounded-[24px] border border-[var(--border-strong)] hover:border-[var(--color-green)]/50 transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] flex items-center justify-center">
                  {getFileIcon(file.mimeType, file.name)}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(file)}
                    className="w-8 h-8 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-green)] hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--color-green)]/30 transition-all"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file)}
                    className="w-8 h-8 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-surface)] border border-transparent hover:border-red-400/30 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-sm text-[var(--text-primary)] truncate mb-1" title={file.name}>{file.name}</h3>
              <p className="text-[10px] text-[var(--text-muted)] font-mono-sos uppercase tracking-widest mb-6">
                {formatFileSize(file.sizeBytes)} • {new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>

              <div className="mt-auto pt-4 border-t border-[var(--border)] flex justify-between items-center">
                <span className="text-[10px] text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">Added by</span>
                <span className="text-xs font-bold text-[var(--text-muted)]">{file.uploaderName}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
