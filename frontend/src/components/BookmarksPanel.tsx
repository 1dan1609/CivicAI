"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Landmark, FileText, CalendarDays, ShieldCheck, Trash2, Search, ExternalLink, Bookmark } from "lucide-react";

export interface BookmarkItem {
  id?: string;
  document_id: string;
  title: string;
  agency: string;
  doc_type: string;
  year: string;
  status: string;
  notes: string;
  timestamp?: any;
  document_url?: string;
}

interface BookmarksPanelProps {
  bookmarks: BookmarkItem[];
  isLoading: boolean;
  onRemoveBookmark: (bookmarkId: string) => void;
  onSelectBookmark: (query: string) => void;
  apiBaseUrl?: string;
}

export default function BookmarksPanel({
  bookmarks,
  isLoading,
  onRemoveBookmark,
  onSelectBookmark,
  apiBaseUrl,
}: BookmarksPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBookmarks = bookmarks.filter((b) => {
    const searchLower = searchTerm ? searchTerm.toLowerCase() : "";
    return (
      b.title.toLowerCase().includes(searchLower) ||
      b.notes.toLowerCase().includes(searchLower) ||
      b.agency.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="border border-border/40 bg-card/50 backdrop-blur-md shadow-sm h-full flex flex-col overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground/80">
              <Bookmark className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20" />
              District Aide Research Notebook
            </CardTitle>
            <CardDescription className="text-[11px] font-semibold text-muted-foreground mt-0.5">
              Annotations and bookmarks saved to Google Cloud Firestore.
            </CardDescription>
          </div>
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-amber-500/20 text-[10px] font-black font-mono">
            {bookmarks.length} Saved
          </Badge>
        </div>
        
        {/* Search bar inside notebook */}
        {bookmarks.length > 0 && (
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Search notebook titles, notes, agencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/50 focus-visible:ring-amber-500"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex flex-col gap-2 py-10 justify-center items-center text-center">
            <div className="flex gap-1.5 items-center">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"></span>
            </div>
            <p className="text-xs text-muted-foreground/80 font-semibold">Syncing with Firestore database...</p>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
            <Bookmark className="h-9 w-9 mb-2.5 text-muted-foreground/20" />
            <h3 className="font-bold text-foreground/80 text-xs mb-1">Your notebook is empty</h3>
            <p className="text-[11px] text-muted-foreground/70 max-w-[220px] leading-relaxed">
              Use the bookmark icon on any search result card to save reference materials and take custom notes.
            </p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
            <Search className="h-7 w-7 mb-2 text-muted-foreground/30" />
            <p className="text-xs font-semibold">No notebook records match "{searchTerm}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredBookmarks.map((b) => (
              <div 
                key={b.id} 
                className="group border border-border/30 bg-background/40 hover:bg-background/80 hover:border-border/60 p-3 rounded-xl transition-all shadow-2xs relative flex flex-col gap-2.5"
              >
                {/* Meta details */}
                <div className="flex items-center justify-between gap-2 flex-wrap select-none">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] font-medium bg-muted/10 border-border/30">
                      <Landmark className="h-2.5 w-2.5 mr-1 text-primary/70" />
                      {b.agency}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] font-medium bg-muted/10 border-border/30">
                      <FileText className="h-2.5 w-2.5 mr-1 text-primary/70" />
                      {b.doc_type}
                    </Badge>
                  </div>
                  
                  {/* Remove and search triggers */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {(() => {
                      const baseUrl = apiBaseUrl || "https://civic-ai-backend-367616383035.us-central1.run.app";
                      const fallbackFilename = b.document_id 
                        ? (b.document_id.includes(".") ? b.document_id : `${b.document_id}.pdf`) 
                        : null;
                      const directUrl = b.document_url || (fallbackFilename ? `${baseUrl}/api/documents/${fallbackFilename}` : null);
                      
                      return directUrl ? (
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-primary hover:bg-primary/10 rounded-md"
                          title="Open document PDF"
                        >
                          <a 
                            href={directUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onSelectBookmark(b.title);
                          }}
                          className="h-6 w-6 text-primary hover:bg-primary/10 rounded-md"
                          title="Search for document"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      );
                    })()}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (b.id) onRemoveBookmark(b.id);
                      }}
                      className="h-6 w-6 text-red-500 hover:bg-red-500/10 rounded-md"
                      title="Delete bookmark record"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Document Title */}
                <h4 className="text-xs font-bold leading-snug text-foreground/90 pr-6">
                  {b.title}
                </h4>

                {/* Annotation notes */}
                {b.notes ? (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-[11px] font-medium text-amber-900 dark:text-amber-300 leading-normal italic">
                    "{b.notes}"
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/60 italic font-medium">
                    No research notes added. Click edit on search results to add details.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
