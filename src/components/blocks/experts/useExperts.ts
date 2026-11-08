"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/utils/supabase/client";
import { DEFAULT_EXPERTS, withPhotos, type ExpertProfile } from "./expertsData";

/**
 * Shared expert list and "which expert is picked" for the Platter blocks.
 *
 * The field pie (P3), the profile card (P4) and the price list (P6) used to
 * share state inside one big page component. Keeping it here instead lets
 * each of them be its own block on any page: picking a slice in the pie still
 * changes the card, wherever the two sit. The list is fetched once per visit.
 */

interface ExpertsState {
  experts: ExpertProfile[];
  loading: boolean;
  selectedId: string;
}

let state: ExpertsState = { experts: [], loading: true, selectedId: "" };
const subscribers = new Set<() => void>();
let started = false;

function set(next: Partial<ExpertsState>) {
  state = { ...state, ...next };
  subscribers.forEach((fn) => fn());
}

function applyFallback() {
  const list = withPhotos(DEFAULT_EXPERTS);
  set({ experts: list, selectedId: state.selectedId || list[0].id, loading: false });
}

async function load() {
  if (!supabase) return applyFallback();
  try {
    // Reads the public view, not `profiles` directly: RLS restricts that
    // table to authenticated users, and this is a public page. The view
    // exposes no contact details.
    const { data, error } = await supabase
      .from("public_experts")
      .select("id, full_name, professional_title, bio, avatar_url, specialties, session_rate_inr");
    if (error) throw error;
    if (!data || data.length === 0) return applyFallback();

    const curated = new Map(DEFAULT_EXPERTS.map((e) => [e.full_name.trim().toLowerCase(), e]));
    const merged: ExpertProfile[] = data.map((p) => {
      const base = curated.get(p.full_name.trim().toLowerCase());
      return {
        phone: null,
        email: null,
        role: "expert",
        ...base,
        id: p.id,
        full_name: p.full_name,
        expert_role: p.professional_title || base?.expert_role,
        bio: p.bio || base?.bio,
        avatar_url: p.avatar_url,
        session_rate_inr: p.session_rate_inr,
        tags: p.specialties?.length ? p.specialties.map((s: string) => s.toUpperCase()) : base?.tags,
      };
    });
    const list = withPhotos(merged);
    set({ experts: list, selectedId: state.selectedId || list[0].id, loading: false });
  } catch (err) {
    console.error("Error loading experts", err);
    applyFallback();
  }
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

const getSnapshot = () => state;

export function useExperts() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!started) {
      started = true;
      load();
    }
  }, []);
  const active = snap.experts.find((e) => e.id === snap.selectedId) || snap.experts[0];
  return {
    experts: snap.experts,
    loading: snap.loading,
    selectedId: snap.selectedId,
    active,
    select: (id: string) => set({ selectedId: id }),
  };
}
