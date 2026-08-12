"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, CalendarClock } from "lucide-react";
import {
  getMyAvailabilityRules,
  addAvailabilityRule,
  deleteAvailabilityRule,
} from "@/lib/data/queries";
import type { AvailabilityRule } from "@/lib/data/types";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ExpertAvailabilityPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyAvailabilityRules()
      .then(setRules)
      .catch((err) => console.error(err));
  }, []);

  const handleAdd = async () => {
    setError("");
    if (startTime >= endTime) {
      setError("End time must be after start time.");
      return;
    }
    setSubmitting(true);
    try {
      const rule = await addAvailabilityRule({ weekday, startTime, endTime });
      setRules((prev) => [...prev, rule].sort((a, b) => a.weekday - b.weekday));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add availability");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvailabilityRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove availability");
    }
  };

  const rulesByWeekday = WEEKDAYS.map((name, idx) => ({
    name,
    rules: rules.filter((r) => r.weekday === idx),
  }));

  return (
    <div className="w-full relative min-h-screen flex flex-col pt-6 pb-24">
      {/* HEADER SECTION */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-[var(--text-primary)] flex items-center gap-4">
            <CalendarClock size={32} className="text-purple-400" /> Availability
          </h1>
          <p className="font-mono-sos text-sm text-[var(--text-muted)] mt-3 tracking-widest uppercase">Set your weekly consultation hours</p>
        </div>
      </header>

      {/* ADD RULE FORM */}
      <div className="glass-panel p-8 rounded-[32px] border border-[var(--border-strong)] shadow-lg mb-12">
        <h3 className="text-xs font-mono-sos text-[var(--text-faint)] tracking-widest uppercase mb-6">Add Weekly Slot</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">DAY</label>
            <select
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] transition-colors shadow-inner appearance-none cursor-pointer"
            >
              {WEEKDAYS.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">START TIME</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] [color-scheme:dark] transition-colors shadow-inner"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-mono-sos text-[var(--text-faint)] mb-3 tracking-widest">END TIME</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-2xl px-6 py-4 text-lg outline-none focus:border-[var(--color-primary)] text-[var(--text-primary)] [color-scheme:dark] transition-colors shadow-inner"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={submitting}
            className="btn-sos-filled px-8 py-4 text-sm tracking-widest rounded-2xl w-full md:w-auto disabled:opacity-50"
          >
            <Plus size={16} className="mr-2 inline" /> Add
          </button>
        </div>
        {error && <p className="text-sm text-red-400 font-mono-sos mt-4">{error}</p>}
      </div>

      {/* WEEKLY SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rulesByWeekday.map(({ name, rules: dayRules }) => (
          <div key={name} className="glass-panel p-6 rounded-[24px] border border-[var(--border-strong)]">
            <h3 className="font-display text-lg font-bold text-[var(--text-primary)] mb-4">{name}</h3>
            {dayRules.length === 0 ? (
              <p className="text-xs text-[var(--text-faint)] font-mono-sos uppercase tracking-widest">No availability set</p>
            ) : (
              <div className="space-y-3">
                {dayRules.map((rule) => (
                  <div key={rule.id} className="p-4 bg-[var(--bg-surface-2)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
                      <Clock size={14} className="text-purple-400" /> {rule.startTime} – {rule.endTime}
                    </div>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-surface)] transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
