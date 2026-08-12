"use client";

import { FileUp, FolderLock, Search, Download, Trash2, FileText, Image as ImageIcon, Archive } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  getMyVaultFiles,
  uploadVaultFile,
  deleteVaultFile,
  getVaultFileUrl,
  getMySessions,
  getCurrentUserId,
} from "@/lib/data/queries";
import type { VaultFile, Session } from "@/lib/data/types";
import { formatFileSize, formatSessionDate, fileKindOf } from "@/lib/data/format";

export default function ExpertVaultPage() {
  const [activeTab, setActiveTab] = useState("All Files");
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [myFiles, mySessions, uid] = await Promise.all([
          getMyVaultFiles(),
          getMySessions(),
          getCurrentUserId(),
        ]);
        setFiles(myFiles);
        setSessions(mySessions);
        setUserId(uid);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const targetSessionId =
    sessions.find((s) => s.status === "scheduled")?.id ?? sessions[0]?.id ?? null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !targetSessionId) return;

    setUploading(true);
    try {
      const uploaded = await uploadVaultFile(targetSessionId, file);
      setFiles((prev) => [uploaded, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      const url = await getVaultFileUrl(file.storagePath);
      window.open(url, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleDeleteFile = async (file: VaultFile) => {
    if (!confirm("Are you sure you want to delete this encrypted file from the vault?")) return;
    try {
      await deleteVaultFile(file.id, file.storagePath);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const getFileIcon = (mimeType: string | null, name: string) => {
    switch (fileKindOf(mimeType, name)) {
      case 'pdf': return <FileText size={24} className="text-red-400" />;
      case 'image': return <ImageIcon size={24} className="text-cyan-400" />;
      case 'archive': return <Archive size={24} className="text-yellow-400" />;
      default: return <FileText size={24} className="text-[var(--text-muted)]" />;
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="w-full relative min-h-screen flex flex-col pt-6 pb-24">
      {/* HEADER SECTION */}
      <header className="mb-10 flex justify-between items-end border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] flex items-center gap-4">
            <FolderLock size={32} className="text-emerald-400" /> Secure Vault
          </h1>
          <p className="font-mono-sos text-sm text-[var(--text-muted)] mt-3 tracking-widest uppercase">E2E Encrypted File Storage</p>
        </div>
        <div className="flex gap-4 items-start">
          <div className="relative w-64 hidden md:block">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-strong)] rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:border-emerald-400 text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
        </div>
      </header>

      {/* DROPZONE */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
        disabled={!targetSessionId || uploading}
      />
      <div
        onClick={() => targetSessionId && fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed border-[var(--border-strong)] rounded-[32px] p-12 text-center transition-all flex flex-col items-center justify-center mb-12 group bg-[var(--bg-surface-2)] ${targetSessionId ? "hover:border-emerald-400 cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
      >
        <div className="w-20 h-20 rounded-full bg-[var(--bg-surface)] border border-[var(--border-strong)] flex items-center justify-center mb-6 group-hover:bg-emerald-400/10 group-hover:border-emerald-400/30 transition-all">
          <FileUp size={32} className="text-[var(--text-muted)] group-hover:text-emerald-400 transition-colors" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2 text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
          {uploading ? "Uploading..." : "Upload to Vault"}
        </h2>
        <p className="text-sm text-[var(--text-muted)] font-inter mb-6">
          {targetSessionId ? "Drag and drop files here or click to browse." : "No active client sessions to upload into."}
        </p>
        <div className="flex gap-4 text-xs font-mono-sos text-[var(--text-faint)] tracking-widest">
          <span className="bg-[var(--bg-base)] px-4 py-2 rounded-full border border-[var(--border)]">MAX 500MB</span>
          <span className="bg-[var(--bg-base)] px-4 py-2 rounded-full border border-[var(--border)] text-emerald-400/70">AES-256 ENCRYPTED</span>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-8 mb-8 border-b border-[var(--border)]">
        {["All Files", "Shared with Me", "My Uploads"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 ${
              activeTab === tab
                ? "text-[var(--text-primary)] border-emerald-400"
                : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILE LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFiles.map((file) => (
          <div key={file.id} className="glass-panel p-6 rounded-[24px] border border-[var(--border-strong)] hover:border-emerald-400/50 transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border)] flex items-center justify-center">
                {getFileIcon(file.mimeType, file.name)}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 hover:bg-[var(--bg-surface)] border border-transparent hover:border-emerald-400/30 transition-all"
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
            <p className="text-[10px] text-[var(--text-muted)] font-mono-sos uppercase tracking-widest mb-6">{formatFileSize(file.sizeBytes)} • {formatSessionDate(file.createdAt)}</p>

            <div className="mt-auto pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="text-[10px] text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">Added by</span>
              <span className="text-xs font-bold text-[var(--text-muted)]">{file.uploaderName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
