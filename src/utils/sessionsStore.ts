"use client";

export interface Session {
  id: string;
  name: string;
  client: string;
  expert: string;
  date: string;
  time: string;
  status: "scheduled" | "completed";
  duration: string;
}

export interface VaultFile {
  id: number;
  name: string;
  type: string;
  size: string;
  date: string;
  expert: string;
}

export interface ChatMessage {
  id: number;
  expertId: number;
  sender: "client" | "expert";
  text: string;
  time: string;
}

const defaultSessions: Session[] = [
  { id: "sess-101", name: "Architecture Review", client: "Client User", expert: "Dr. Sarah Jenkins", date: "Oct 24, 2026", time: "10:00 AM", status: "scheduled", duration: "60 min" },
  { id: "sess-103", name: "Budget Consultation", client: "Client User", expert: "Michael Chen", date: "Oct 28, 2026", time: "1:30 PM", status: "scheduled", duration: "30 min" },
  { id: "sess-102", name: "Initial Consultation", client: "Client User", expert: "Dr. Sarah Jenkins", date: "Oct 20, 2026", time: "2:00 PM", status: "completed", duration: "45 min" },
  { id: "sess-104", name: "Design Concept Presentation", client: "Client User", expert: "Elena Rodriguez", date: "Oct 15, 2026", time: "11:00 AM", status: "completed", duration: "90 min" },
];

const defaultFiles: VaultFile[] = [
  { id: 1, name: "Project_Brief_v2.pdf", type: "pdf", size: "2.4 MB", date: "Oct 22, 2026", expert: "Dr. Sarah Jenkins" },
  { id: 2, name: "Site_Photos.zip", type: "archive", size: "45.1 MB", date: "Oct 21, 2026", expert: "Michael Chen" },
  { id: 3, name: "Initial_Sketches.png", type: "image", size: "4.8 MB", date: "Oct 18, 2026", expert: "Elena Rodriguez" },
  { id: 4, name: "Contract_Signed.pdf", type: "pdf", size: "1.1 MB", date: "Oct 15, 2026", expert: "Admin" },
];

const defaultMessages: ChatMessage[] = [
  { id: 1, expertId: 1, sender: "expert", text: "Please upload the latest blueprints to the vault before our next session.", time: "10:42 AM" },
  { id: 2, expertId: 1, sender: "client", text: "Will do, thanks! I'll drop them in the secure vault right now.", time: "10:45 AM" },
  { id: 3, expertId: 2, sender: "expert", text: "The load-bearing calculations are ready for your review.", time: "Yesterday" },
  { id: 4, expertId: 3, sender: "expert", text: "Check out the new moodboard in the vault.", time: "Tuesday" },
];

export function getStoredSessions(): Session[] {
  if (typeof window === "undefined") return defaultSessions;
  const data = localStorage.getItem("sos_sessions");
  if (!data) {
    localStorage.setItem("sos_sessions", JSON.stringify(defaultSessions));
    return defaultSessions;
  }
  return JSON.parse(data);
}

export function saveSessions(sessions: Session[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sos_sessions", JSON.stringify(sessions));
}

export function getStoredFiles(): VaultFile[] {
  if (typeof window === "undefined") return defaultFiles;
  const data = localStorage.getItem("sos_files");
  if (!data) {
    localStorage.setItem("sos_files", JSON.stringify(defaultFiles));
    return defaultFiles;
  }
  return JSON.parse(data);
}

export function saveFiles(files: VaultFile[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sos_files", JSON.stringify(files));
}

export function getStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return defaultMessages;
  const data = localStorage.getItem("sos_messages");
  if (!data) {
    localStorage.setItem("sos_messages", JSON.stringify(defaultMessages));
    return defaultMessages;
  }
  return JSON.parse(data);
}

export function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sos_messages", JSON.stringify(messages));
}
