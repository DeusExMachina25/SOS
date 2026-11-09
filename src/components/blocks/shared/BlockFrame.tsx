import React from "react";

/**
 * The centred column and breathing room the Platter-style blocks sit in.
 * Built into each block, so a block keeps its look when it moves page.
 */
export default function BlockFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`container mx-auto px-6 max-w-6xl flex flex-col items-center text-center py-[7.5vh] ${className}`}>
      {children}
    </div>
  );
}
