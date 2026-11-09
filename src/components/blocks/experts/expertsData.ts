import type { FieldKey } from "@/components/platter/FieldPie";

/**
 * Expert records shown on the Platter blocks (P3, P4, P6). The live list comes
 * from Supabase; these curated entries fill gaps and stand in when the
 * database is unreachable.
 */

export interface ExpertProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string;
  expert_role?: string;
  bio?: string;
  /** Portrait from `public_experts.avatar_url`; a monogram is shown when absent. */
  avatar_url?: string | null;
  /** Flat price of a 60-minute session, in rupees, from public_experts. */
  session_rate_inr?: number | null;
  tags?: string[];
  disciplines?: { id: string; title: string; desc: string }[];
  /* Which pie segment this expert sits under. No column for this exists in
     `profiles` yet, so it travels with the hardcoded metadata below. */
  field?: FieldKey;
}

/**
 * One expert per division. Prices are not stored here: they come from each
 * expert's `session_rate_inr` in the database.
 */
export const DEFAULT_EXPERTS: ExpertProfile[] = [
  {
    id: "789e4567-e89b-12d3-a456-426614174000",
    full_name: "Shravani Reddy",
    phone: "+919876543210",
    email: "shravani@sos.com",
    role: "expert",
    field: "architecture",
    expert_role: "Principal Architect & Interior Designer",
    bio: "Ten years running an independent residential practice in the city and the countryside. Apartment interiors and how rooms connect, structure and materials on new builds, and master plans for larger plots outside town.",
    tags: ["RESIDENTIAL ARCHITECTURE", "INTERIOR DESIGN", "MASTER PLANNING"],
    disciplines: [
      { id: "01", title: "Interiors & Spatial Flow", desc: "How to use a city flat well: how you move through it, where things get stored and which materials to use, room by room." },
      { id: "02", title: "Site & Structural Strategy", desc: "Reading the plot, the loads and the foundations before drawing any walls, then detailing joints that age well." },
      { id: "03", title: "Master Planning & Compliance", desc: "Contours, drainage and building in phases on larger plots, planned so it gets through approval." }
    ]
  },
  {
    id: "789e4567-e89b-12d3-a456-426614174001",
    full_name: "Sudhamshu Reddy",
    phone: "+919876543211",
    email: "sudhamshu@sos.com",
    role: "expert",
    field: "sustainability",
    expert_role: "Renewable Systems Engineer",
    bio: "Renewable energy, waste systems and 3D printing, planned into a project from day one instead of added once it's built.",
    tags: ["RENEWABLE SYSTEMS", "WASTE MANAGEMENT", "3D PRINTING"],
    disciplines: [
      { id: "01", title: "Renewable Systems", desc: "Solar panels, batteries and load planning sized to what the building uses." },
      { id: "02", title: "Waste Management", desc: "Sorting, composting and water reuse, planned in from the start." },
      { id: "03", title: "Additive Manufacturing", desc: "3D-printed parts and formwork, and how to tell when printing is the wrong choice." }
    ]
  },
  {
    id: "789e4567-e89b-12d3-a456-426614174002",
    full_name: "Yasasvi Jampana",
    phone: "+919876543212",
    email: "yasasvi@sos.com",
    role: "expert",
    field: "travel",
    expert_role: "Travel Experience Curator",
    bio: "Trip planning built around the places worth stopping for, plus the transport and paperwork that decide whether a trip works.",
    tags: ["ITINERARY DESIGN", "ROUTE PLANNING", "CURATED STAYS"],
    disciplines: [
      { id: "01", title: "Route & Pacing", desc: "How far to move each day, and when the answer is to stay put." },
      { id: "02", title: "Curated Stays", desc: "Places worth the detour, which aren't always the best rated." },
      { id: "03", title: "Ground Logistics", desc: "Permits, transfers and the small things that go wrong on a trip." }
    ]
  }
];

/**
 * Portraits for experts, keyed by lower-case full name. Drop the image into
 * `public/experts/` (portrait crop, about 1200 x 1500, JPG or WebP) and add a
 * line here, e.g.  "shravani reddy": "/experts/shravani-reddy.jpg".
 * A photo set on the expert in the database (`avatar_url`) always wins; with
 * neither, the page shows a monogram.
 */
const EXPERT_PHOTOS: Record<string, string> = {};

export function withPhotos(list: ExpertProfile[]): ExpertProfile[] {
  return list.map((e) => ({
    ...e,
    avatar_url: e.avatar_url || EXPERT_PHOTOS[e.full_name.trim().toLowerCase()] || null,
  }));
}

