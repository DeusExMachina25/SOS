"use client";

import React from "react";
import { AppWindow, DoorOpen, Hand, MousePointer2, PenLine, RectangleHorizontal, Sofa } from "lucide-react";

/**
 * The sketcher's tools, grouped by job. A vertical rail beside the canvas
 * from md up; a dock under the canvas on phones.
 */

export type Tool = "select" | "wall" | "room" | "door" | "window" | "item" | "pan";

interface ToolDef {
  id: Tool;
  name: string;
  key: string;
  Icon: React.ComponentType<{ size?: number }>;
  /** Hidden in the phone dock: dragging empty space already moves the view. */
  desktopOnly?: boolean;
}

export const TOOL_GROUPS: { name: string; tools: ToolDef[] }[] = [
  {
    name: "Navigate",
    tools: [
      { id: "select", name: "Select", key: "v", Icon: MousePointer2 },
      { id: "pan", name: "Move", key: "h", Icon: Hand, desktopOnly: true },
    ],
  },
  {
    name: "Draw",
    tools: [
      { id: "room", name: "Room", key: "r", Icon: RectangleHorizontal },
      { id: "wall", name: "Wall", key: "w", Icon: PenLine },
    ],
  },
  {
    name: "Openings",
    tools: [
      { id: "door", name: "Door", key: "d", Icon: DoorOpen },
      { id: "window", name: "Window", key: "n", Icon: AppWindow },
    ],
  },
  {
    name: "Furnish",
    tools: [{ id: "item", name: "Library", key: "i", Icon: Sofa }],
  },
];

export const TOOLS: ToolDef[] = TOOL_GROUPS.flatMap((g) => g.tools);

export default function ToolRail({ tool, onChoose }: { tool: Tool; onChoose: (t: Tool) => void }) {
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="flex md:flex-col gap-1 md:gap-0 p-2 md:py-3 shrink-0 md:w-[76px] border-t md:border-t-0 md:border-r border-[var(--border)] bg-[var(--bg-base)]"
    >
      {TOOL_GROUPS.map((g, gi) => (
        <div key={g.name} className={`flex md:flex-col gap-1 flex-1 md:flex-none ${gi ? "pl-1 md:pl-0 md:pt-3 md:mt-3 border-l md:border-l-0 md:border-t border-[var(--border)]" : ""}`}>
          <span className="hidden md:block font-mono-sos text-[8px] tracking-[0.2em] uppercase text-[var(--text-faint)] text-center mb-1">{g.name}</span>
          {g.tools.map(({ id, name, key, Icon, desktopOnly }) => (
            <button
              key={id}
              onClick={() => onChoose(id)}
              aria-pressed={tool === id}
              title={`${name} (${key.toUpperCase()})`}
              className={`plan-tool ${desktopOnly ? "max-md:!hidden" : ""}`}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
