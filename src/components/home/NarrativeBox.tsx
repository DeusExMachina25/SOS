"use client";

import React from "react";

interface NarrativeBoxProps {
  title: string;
  paragraphs: string[];
  remark?: string;
  theme?: "default" | "cyan" | "gold" | "pink";
  style?: React.CSSProperties;
  className?: string;
}

export default function NarrativeBox({ 
  title, 
  paragraphs, 
  remark, 
  theme = "default",
  style,
  className = ""
}: NarrativeBoxProps) {
  
  const themeClass = theme !== "default" ? `narrative-${theme}` : "";
  
  return (
    <div 
      className={`narrative-box ${themeClass} ${className}`}
      style={style}
    >
      <h3>{title}</h3>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {remark && <span className="narrative-remark">{remark}</span>}
    </div>
  );
}
