"use client";

/**
 * Retainer balance, invoices, and project-phase tracking have no backend
 * yet — no `invoices` or `retainer_balance` table exists in the migrations.
 * This is a deliberate scope boundary (see the Stage 2 plan): real
 * sessions/vault/chat data all moved to src/lib/data/queries.ts, but this
 * slice stays mock until a real billing model is designed.
 *
 * Was `sessionsStore.ts` — renamed once its session/vault/chat exports
 * (and their localStorage-backed types) were fully replaced and deleted.
 */

export interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  date: string;
  status: "paid" | "pending";
}

const defaultInvoices: Invoice[] = [
  { id: "inv-2026-001", invoiceNumber: "INV-2026-001", description: "Initial Consultation Setup", amount: 5000, date: "Oct 15, 2026", status: "paid" },
  { id: "inv-2026-002", invoiceNumber: "INV-2026-002", description: "Design Concept Presentation Fee", amount: 7500, date: "Oct 18, 2026", status: "paid" },
  { id: "inv-2026-003", invoiceNumber: "INV-2026-003", description: "Architecture Review Session Billed", amount: 2500, date: "Oct 24, 2026", status: "paid" },
];

export function getStoredInvoices(): Invoice[] {
  if (typeof window === "undefined") return defaultInvoices;
  const data = localStorage.getItem("sos_invoices");
  if (!data) {
    localStorage.setItem("sos_invoices", JSON.stringify(defaultInvoices));
    return defaultInvoices;
  }
  return JSON.parse(data);
}

export function saveInvoices(invoices: Invoice[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sos_invoices", JSON.stringify(invoices));
}

export function getRetainerBalance(): number {
  if (typeof window === "undefined") return 15000;
  const data = localStorage.getItem("sos_retainer_balance");
  if (!data) {
    localStorage.setItem("sos_retainer_balance", "15000");
    return 15000;
  }
  return parseFloat(data);
}

export function saveRetainerBalance(balance: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sos_retainer_balance", balance.toString());
}

export function getProjectPhase(): string {
  if (typeof window === "undefined") return "Phase 2: Structural Spec Drafting";
  const data = localStorage.getItem("sos_project_phase");
  if (!data) {
    localStorage.setItem("sos_project_phase", "Phase 2: Structural Spec Drafting");
    return "Phase 2: Structural Spec Drafting";
  }
  return data;
}

export function saveProjectPhase(phase: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sos_project_phase", phase);
}
