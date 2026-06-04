"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Terminal, FileCheck, HelpCircle, ArrowRight } from "lucide-react";
import { SearchResultItem } from "./ResultCard";

interface ReasoningPanelProps {
  results: SearchResultItem[];
  synthesis: string;
  relatedQueries?: string[];
  isLoading: boolean;
  onCitationHover: (index: number | null) => void;
  onRelatedQueryClick?: (query: string) => void;
}

export default function ReasoningPanel({
  results,
  synthesis,
  relatedQueries = [],
  isLoading,
  onCitationHover,
  onRelatedQueryClick,
}: ReasoningPanelProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const prevSynthesisRef = useRef("");

  // Generate synthesis content based on retrieved documents
  useEffect(() => {
    if (!synthesis) {
      setDisplayedText("");
      setIsTyping(false);
      prevSynthesisRef.current = "";
      return;
    }

    // Synchronous comparison prevents scheduling lag
    if (synthesis !== prevSynthesisRef.current) {
      setDisplayedText("");
      setIsTyping(true);
      prevSynthesisRef.current = synthesis;
    }
  }, [synthesis]);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping || !synthesis) return;

    let index = 0;
    const words = synthesis.split(" ");
    let currentText = "";
    
    const interval = setInterval(() => {
      if (index < words.length) {
        currentText += (index === 0 ? "" : " ") + words[index];
        setDisplayedText(currentText);
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 45); // Adjust typing speed here

    return () => clearInterval(interval);
  }, [isTyping, synthesis]);

  // Helper to parse displayedText and highlight citation tags e.g. [1] or [2]
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Split text by citations like [1], [2], etc.
    const parts = text.split(/(\[\d+\])/g);
    
    return parts.map((part, idx) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const docIdx = parseInt(match[1], 10) - 1;
        const targetDoc = results[docIdx];
        const docUrl = targetDoc?.document_url;
        
        if (docUrl) {
          return (
            <a
              key={idx}
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mx-0.5 cursor-pointer bg-primary/10 hover:bg-primary hover:text-primary-foreground font-mono text-xs font-bold text-primary px-1 rounded border border-primary/25 transition-all select-none hover:scale-105 active:scale-95"
              onMouseEnter={() => onCitationHover(docIdx)}
              onMouseLeave={() => onCitationHover(null)}
              title={`Click to view source: ${targetDoc.title}`}
            >
              {part}
            </a>
          );
        }

        return (
          <span
            key={idx}
            className="inline-flex mx-0.5 cursor-help bg-primary/10 hover:bg-primary hover:text-primary-foreground font-mono text-xs font-bold text-primary px-1 rounded border border-primary/25 transition-all select-none"
            onMouseEnter={() => onCitationHover(docIdx)}
            onMouseLeave={() => onCitationHover(null)}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-sm h-full flex flex-col overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          CivicAI Reasoning Agent
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto justify-start">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-12 justify-center items-center text-center">
            <div className="flex gap-1.5 items-center">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce"></span>
            </div>
            <p className="text-xs text-muted-foreground/80 font-semibold">Synthesizing findings and citing documents...</p>
          </div>
        ) : !synthesis ? (
          <div className="flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
            <Terminal className="h-8 w-8 mb-2.5 text-muted-foreground/30" />
            <p className="text-xs font-bold max-w-[200px] leading-relaxed text-muted-foreground/80">
              Enter a search query to activate the AI reasoning panel.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Typewritten synthesis text */}
            <div className="text-sm leading-relaxed text-foreground/85 font-normal break-words">
              {renderFormattedText(displayedText)}
              {isTyping && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/70 animate-pulse shrink-0 align-middle"></span>
              )}
            </div>
            
            {/* Clickable Related follow-up queries */}
            {relatedQueries && relatedQueries.length > 0 && !isTyping && (
              <div className="border-t border-border/40 pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  Related Research Questions
                </span>
                <div className="flex flex-col gap-1.5 mt-0.5 w-full">
                  {relatedQueries.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => onRelatedQueryClick && onRelatedQueryClick(q)}
                      className="w-full text-left text-xs bg-muted/30 hover:bg-primary/5 hover:text-primary p-2 rounded-xl border border-border/30 hover:border-primary/20 transition-all cursor-pointer font-semibold leading-normal flex items-start gap-2 group overflow-hidden"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-primary/50 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                      <span className="flex-1 break-words whitespace-normal min-w-0">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
 
            {/* Sources checklist */}
            {!isTyping && results.length > 0 && (
              <div className="border-t border-border/40 pt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <FileCheck className="h-3.5 w-3.5 text-green-500" />
                  Sources Verified ({results.length})
                </span>
                <ul className="text-[11px] text-muted-foreground/90 space-y-2 pl-0.5">
                  {results.map((res, i) => (
                    <li 
                      key={res.document_id} 
                      className="hover:text-foreground cursor-pointer flex items-center gap-2 min-w-0 w-full"
                      onMouseEnter={() => onCitationHover(i)}
                      onMouseLeave={() => onCitationHover(null)}
                    >
                      <span className="font-mono text-primary font-bold bg-primary/5 border border-primary/10 px-1 rounded shrink-0">[{i + 1}]</span>
                      {res.document_url ? (
                        <a 
                          href={res.document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-semibold underline underline-offset-2 decoration-border truncate min-w-0 flex-1 hover:text-primary transition-colors"
                          title="Click to view public PDF document"
                        >
                          {res.title}
                        </a>
                      ) : (
                        <span className="font-semibold underline underline-offset-2 decoration-border truncate min-w-0 flex-1">{res.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
