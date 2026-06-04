"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { 
  CalendarDays, 
  FileText, 
  Landmark, 
  ShieldCheck, 
  Bookmark, 
  BookmarkCheck, 
  Save, 
  Trash2, 
  Edit3, 
  ExternalLink,
  Layers
} from "lucide-react";

export interface ClusterDocument {
  document_id: string;
  title: string;
  agency: string;
  doc_type: string;
  year: string;
  status: string;
  snippets: string[];
  document_url?: string;
  filename?: string;
  citation_index: number;
}

export interface DocumentClusterItem {
  cluster_title: string;
  combined_overview: string;
  combined_points: string[];
  documents: ClusterDocument[];
}

interface ResultCardProps {
  cluster: DocumentClusterItem;
  clusterIndex: number;
  hoveredCitationIndex: number | null;
  onCitationHover: (index: number | null) => void;
  isSignedIn?: boolean;
  bookmarks?: any[];
  onBookmark?: (doc: ClusterDocument, notes: string) => void;
  onUnbookmark?: (docId: string) => void;
  onShowSignInPrompt: (reason: string) => void;
}

function parseBoldText(text: string) {
  if (!text) return "";
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} className="font-extrabold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function ResultCard({
  cluster,
  clusterIndex,
  hoveredCitationIndex,
  onCitationHover,
  isSignedIn = false,
  bookmarks = [],
  onBookmark,
  onUnbookmark,
  onShowSignInPrompt,
}: ResultCardProps) {
  return (
    <Card 
      id={`cluster-card-${clusterIndex}`}
      className="transition-all duration-300 border border-border/40 bg-card/45 backdrop-blur-md shadow-xs hover:border-border/80 hover:shadow-md rounded-2xl overflow-hidden"
    >
      <CardHeader className="p-5 pb-3 bg-muted/15 border-b border-border/30">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base font-extrabold leading-snug text-foreground flex items-center gap-2 select-none">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            {cluster.cluster_title}
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 shrink-0 select-none">
            {cluster.documents.length} {cluster.documents.length === 1 ? "document" : "documents"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-5 flex flex-col gap-4">
        {/* Dynamic layperson Overview sentence */}
        {cluster.combined_overview && (
          <div className="text-sm font-medium text-foreground/90 leading-relaxed flex items-start gap-3 bg-primary/5 border border-primary/10 rounded-xl p-3.5 shadow-3xs">
            <span className="inline-flex items-center justify-center font-mono text-[9px] font-black text-primary bg-primary/15 border border-primary/25 rounded px-2 py-0.5 shrink-0 select-none uppercase tracking-wider">
              Overview
            </span>
            <p className="flex-1 text-sm text-foreground/85 font-medium leading-relaxed">
              {parseBoldText(cluster.combined_overview)}
            </p>
          </div>
        )}

        {/* Dynamic Key points list */}
        {cluster.combined_points && cluster.combined_points.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 select-none">
              Key Findings & Facts
            </h4>
            <ul className="space-y-3.5 pl-1">
              {cluster.combined_points.map((point, pIdx) => (
                <li key={pIdx} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0 mt-2"></span>
                  <p className="flex-1 text-sm text-foreground/80 font-normal leading-relaxed">
                    {parseBoldText(point)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Documents Sources Section */}
        <div className="border-t border-border/40 pt-4 mt-1 space-y-3">
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1 select-none">
            Grouped Document Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {cluster.documents.map((doc) => {
              const bookmarkedEntry = bookmarks.find((b) => b.document_id === doc.document_id);
              const isBookmarked = !!bookmarkedEntry;
              const isHighlighted = hoveredCitationIndex === (doc.citation_index - 1);
              
              return (
                <DocumentSourcePill
                  key={doc.document_id}
                  doc={doc}
                  isHighlighted={isHighlighted}
                  onCitationHover={onCitationHover}
                  isSignedIn={isSignedIn}
                  isBookmarked={isBookmarked}
                  bookmarkNotes={bookmarkedEntry?.notes || ""}
                  onBookmark={(notes) => onBookmark && onBookmark(doc, notes)}
                  onUnbookmark={() => onUnbookmark && onUnbookmark(doc.document_id)}
                  onShowSignInPrompt={onShowSignInPrompt}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DocumentSourcePillProps {
  doc: ClusterDocument;
  isHighlighted: boolean;
  onCitationHover: (index: number | null) => void;
  isSignedIn: boolean;
  isBookmarked: boolean;
  bookmarkNotes: string;
  onBookmark: (notes: string) => void;
  onUnbookmark: () => void;
  onShowSignInPrompt: (reason: string) => void;
}

function DocumentSourcePill({
  doc,
  isHighlighted,
  onCitationHover,
  isSignedIn,
  isBookmarked,
  bookmarkNotes,
  onBookmark,
  onUnbookmark,
  onShowSignInPrompt,
}: DocumentSourcePillProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(bookmarkNotes);

  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark(notes);
    setIsEditingNotes(false);
  };

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) {
      onShowSignInPrompt("Sign in to save documents to your notebook.");
      return;
    }
    if (isBookmarked) {
      onUnbookmark();
      setNotes("");
      setIsEditingNotes(false);
    } else {
      setIsEditingNotes(true);
      onBookmark("");
    }
  };

  const pillContent = (
    <>
      <span className={`font-mono font-bold text-[10px] px-1 py-0.5 rounded shrink-0 ${
        isHighlighted 
          ? "bg-primary-foreground/20 text-primary-foreground"
          : "bg-primary/10 text-primary"
      }`}>
        [{doc.citation_index}]
      </span>
      <span className="truncate max-w-[140px] font-semibold">{doc.title}</span>
      {doc.document_url && (
        <ExternalLink className={`h-3 w-3 shrink-0 opacity-60 hover:opacity-100 ${isHighlighted ? "text-primary-foreground" : "text-foreground"}`} />
      )}
    </>
  );

  const pillClass = `inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-medium text-xs cursor-pointer transition-all duration-200 select-none hover:scale-[1.02] active:scale-[0.98] ${
    isHighlighted 
      ? "bg-primary text-primary-foreground border-primary shadow-sm"
      : isBookmarked
      ? "bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15"
      : "bg-muted/40 text-foreground/80 border-border/50 hover:bg-muted hover:text-foreground"
  }`;

  return (
    <HoverCard openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        {doc.document_url ? (
          <a
            href={doc.document_url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => onCitationHover(doc.citation_index - 1)}
            onMouseLeave={() => onCitationHover(null)}
            className={pillClass}
            title="Open document in new tab"
          >
            {pillContent}
          </a>
        ) : (
          <div
            onMouseEnter={() => onCitationHover(doc.citation_index - 1)}
            onMouseLeave={() => onCitationHover(null)}
            className={pillClass}
          >
            {pillContent}
          </div>
        )}
      </HoverCardTrigger>
      
      <HoverCardContent 
        side="top" 
        align="center" 
        className="w-80 p-4 border border-border/80 shadow-lg bg-popover text-popover-foreground rounded-2xl z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/40 pb-2">
            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-bold">
              ID: {doc.document_id}
            </span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[9px] font-medium bg-muted/10 border-border/40">
                {doc.agency}
              </Badge>
              <Badge variant="outline" className="text-[9px] font-medium bg-muted/10 border-border/40">
                {doc.year}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-[9px] font-medium ${
                  doc.status === "Passed" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                    : doc.status === "Active"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}
              >
                {doc.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground leading-snug">
              {doc.title}
            </h4>
            <p className="text-[10px] text-muted-foreground font-semibold">
              Type: {doc.doc_type}
            </p>
          </div>

          {/* Transcript snippets preview */}
          {doc.snippets && doc.snippets.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block select-none">
                Relevant Passage
              </span>
              <div className="text-[11px] bg-muted/50 p-2.5 rounded-xl text-foreground font-normal leading-normal border border-border/30 max-h-24 overflow-y-auto italic">
                "{doc.snippets[0]}"
              </div>
            </div>
          )}

          {/* Bookmark actions inside hover popover */}
          {isSignedIn && (
            <div className="border-t border-border/40 pt-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 select-none">
                  <BookmarkCheck className="h-3 w-3 shrink-0" />
                  Aide Saved Notebook
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleBookmarkToggle}
                  className={`h-6 px-2 text-[10px] font-bold gap-1 rounded-lg ${
                    isBookmarked 
                      ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" 
                      : "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                  }`}
                >
                  {isBookmarked ? (
                    <>
                      <Trash2 className="h-3 w-3" />
                      Unsave
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3 w-3" />
                      Save Doc
                    </>
                  )}
                </Button>
              </div>

              {isBookmarked && (
                <form onSubmit={handleSaveNotes} className="space-y-1.5">
                  {isEditingNotes ? (
                    <div className="flex gap-1.5">
                      <Input
                        type="text"
                        placeholder="Add priority notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="h-7 text-[10px] bg-background border-amber-500/30 focus-visible:ring-amber-500 flex-1"
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-7 bg-amber-500 hover:bg-amber-600 text-white px-2 rounded-lg shrink-0 text-[10px] font-bold"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl px-2.5 py-1.5 text-[10px] text-amber-900 dark:text-amber-300 leading-normal flex items-start justify-between gap-2 group">
                      <span className="italic flex-1 break-words">
                        {bookmarkNotes ? `"${bookmarkNotes}"` : "Click edit icon to add priority notes..."}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditingNotes(true);
                        }}
                        className="h-4 w-4 text-amber-600 hover:text-amber-700 rounded p-0 shrink-0"
                      >
                        <Edit3 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}

          {doc.document_url && (
            <Button 
              asChild
              size="sm"
              variant="outline" 
              className="w-full h-8 text-[11px] font-bold border-border/60 hover:bg-muted mt-1 rounded-xl cursor-pointer"
            >
              <a 
                href={doc.document_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5"
              >
                Open Document
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
