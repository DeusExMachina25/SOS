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
  const [isTyping, setIsTyping] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!startTyping || isFinished) return;
    
    setIsTyping(true);
    let currentCharIndex = 0;
    
    const typeChar = () => {
      if (currentLineIndex >= lines.length) {
        setIsTyping(false);
        setIsFinished(true);
        return;
      }
      
      const targetText = lines[currentLineIndex].text;
      
      if (currentCharIndex < targetText.length) {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentLineIndex] = targetText.slice(0, currentCharIndex + 1);
          return newLines;
        });
        currentCharIndex++;
        setTimeout(typeChar, 60);
      } else {
        setCurrentLineIndex(prev => prev + 1);
        currentCharIndex = 0;
        setTimeout(typeChar, 100); // pause between lines
      }
    };
    
    const timeout = setTimeout(typeChar, 100);
    
    return () => clearTimeout(timeout);
  }, [startTyping, currentLineIndex, isFinished, lines]);

  return (
    <div 
      className={`font-display italic text-4xl md:text-5xl lg:text-7xl leading-tight flex flex-wrap gap-x-3 md:gap-x-4 ${className}`}
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
