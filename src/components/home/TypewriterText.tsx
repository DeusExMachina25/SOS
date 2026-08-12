"use client";

import { useEffect, useState } from "react";

interface Line {
  text: string;
  colorClass: string;
}

interface TypewriterTextProps {
  lines: Line[];
  startTyping: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export default function TypewriterText({ lines, startTyping, style, className = "" }: TypewriterTextProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>(lines.map(() => ""));
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [prevLinesKey, setPrevLinesKey] = useState(() => JSON.stringify(lines));
  const currentLinesKey = JSON.stringify(lines);
  if (currentLinesKey !== prevLinesKey) {
    setPrevLinesKey(currentLinesKey);
    setDisplayedLines(lines.map(() => ""));
    setCurrentLineIndex(0);
    setIsFinished(false);
  }

  useEffect(() => {
    if (!startTyping || isFinished) return;
    
    let timeout: NodeJS.Timeout;
    
    // Instead of restarting the effect on currentLineIndex, we'll keep all state in refs or functional updates 
    // to avoid the closure stale state problem, OR we can just use a recursive function that tracks its own indices.
    
    // We will use a recursive async loop for simpler cleanup
    let isCancelled = false;
    
    const typeText = async () => {
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const targetText = lines[lineIdx].text;
        
        for (let charIdx = 0; charIdx <= targetText.length; charIdx++) {
          if (isCancelled) return;
          
          setCurrentLineIndex(lineIdx);
          setDisplayedLines(prev => {
            const newLines = [...prev];
            // ensure array is long enough
            while (newLines.length <= lineIdx) newLines.push("");
            newLines[lineIdx] = targetText.slice(0, charIdx);
            return newLines;
          });
          
          if (charIdx < targetText.length) {
            await new Promise(r => { timeout = setTimeout(r, 60); });
          }
        }
        
        if (isCancelled) return;
        await new Promise(r => { timeout = setTimeout(r, 100); });
      }
      
      if (!isCancelled) {
        setIsFinished(true);
      }
    };

    typeText();
    
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [startTyping, lines, isFinished]);

  return (
    <div 
      className={`font-display italic text-4xl md:text-5xl lg:text-7xl leading-tight flex flex-col gap-y-2 md:gap-y-4 ${className}`}
      style={style}
    >
      {lines.map((line, idx) => (
        <div key={idx} className={line.colorClass}>
          {displayedLines[idx]}
          {startTyping && !isFinished && currentLineIndex === idx && (
            <span className="inline-block w-1.5 md:w-2 h-[0.9em] bg-current ml-2 align-middle animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}
