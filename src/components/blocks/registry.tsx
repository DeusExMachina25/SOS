import type { ComponentType } from "react";

import UsHero from "./us/UsHero";
import { GenesisRender, GenesisCollective, GenesisStandard } from "./us/Genesis";
import Manifesto from "./us/Manifesto";
import EyesOnThePrize from "./us/EyesOnThePrize";
import Editorial from "./us/Editorial";

import AngleHero from "./platter/AngleHero";
import PlatterIntro from "./platter/PlatterIntro";
import FieldPicker from "./platter/FieldPicker";
import ExpertProfile from "./platter/ExpertProfile";
import HowBooking from "./platter/HowBooking";
import Investment from "./platter/Investment";
import TalkAbout from "./platter/TalkAbout";

import LetsTalk from "./shared/LetsTalk";

/**
 * Every block the marketing pages can show, by its code.
 * Each block is self-contained (its own spacing, animation and data), so it
 * works on any page. Page order lives in src/config/pageLayout.ts.
 */
export const BLOCKS = {
  U1: { name: "Us hero", Component: UsHero },
  U2: { name: "Genesis 001: Every render hides a section", Component: GenesisRender },
  U3: { name: "Genesis 002: Invited, not listed", Component: GenesisCollective },
  U4: { name: "Genesis 003: Measured on what stands", Component: GenesisStandard },
  U5: { name: "The Manifesto temple", Component: Manifesto },
  U6: { name: "Keep your eyes on the prize", Component: EyesOnThePrize },
  U7: { name: "Editorial cards", Component: Editorial },
  U8: { name: "Let's Talk (Us version)", Component: () => <LetsTalk source="us" spacious /> },

  P1: { name: "ANGLE hero", Component: AngleHero },
  P2: { name: "The Platter title", Component: PlatterIntro },
  P3: { name: "Field pie", Component: FieldPicker },
  P4: { name: "Expert profile card", Component: ExpertProfile },
  P5: { name: "How booking works", Component: HowBooking },
  P6: { name: "Investment", Component: Investment },
  P7: { name: "We've got a lot to talk about", Component: TalkAbout },
  P8: { name: "Let's Talk (Platter version)", Component: () => <LetsTalk source="platter" /> },
} satisfies Record<string, { name: string; Component: ComponentType }>;

export type BlockId = keyof typeof BLOCKS;
