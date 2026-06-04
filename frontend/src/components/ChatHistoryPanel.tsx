"use client";

import React from "react";
import { Loader2, MessageSquare, Trash2, Calendar, Lock } from "lucide-react";

export interface ChatSession {
  id: string;
  title: string;
  timestamp?: string;
  turns: string; // Client-side encrypted stringified JSON
}

interface ChatHistoryPanelProps {
  chats: ChatSession[];
  isLoading: boolean;
  activeChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
  onDeleteChat: (chatId: string) => void;
}

export default function ChatHistoryPanel({
  chats,
  isLoading,
  activeChatId,
  onSelectChat,
  onDeleteChat
}: ChatHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground h-48">
        <Loader2 className="h-5 w-5 animate-spin text-primary mb-2" />
        <p className="text-xs font-semibold">Loading history index...</p>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground/60 h-48 border border-dashed border-border/50 rounded-2xl bg-muted/10">
        <MessageSquare className="h-6 w-6 text-primary mb-2 opacity-50" />
        <p className="text-xs font-bold">No Conversations Yet</p>
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-1">
          Start a new search, and your secure research logs will appear here.
        </p>
      </div>
    );
  }

  const formatChatDate = (isoString?: string) => {
    if (!isoString) return "Recent Session";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Recent Session";
    }
  };

  return (
    <div className="space-y-2 select-none animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
          Conversations ({chats.length})
        </span>
      </div>

      <div className="space-y-1.5 max-h-[350px] overflow-y-auto px-1 pr-1.5">
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;
          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={`group flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                isActive
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-card hover:bg-muted border-border/30 hover:border-border/80"
              }`}
            >
              <div className="flex gap-3.5 items-center flex-1 min-w-0 pr-2">
                <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/70"}`} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h5 className="text-xs font-bold truncate text-foreground leading-snug">
                    {chat.title}
                  </h5>
                  <span className="text-[9px] text-muted-foreground/80 font-medium flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {formatChatDate(chat.timestamp)}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg text-muted-foreground/60 transition-all shrink-0 cursor-pointer"
                title="Delete secure conversation"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
