"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { cn, formatEnum } from "@/lib/utils";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AuraLogo } from "@/components/ui/aura-logo";

interface ConversationPreview {
  id: string;
  channel: string;
  startedAt: string;
  lastMessage?: { content: string; role: string; createdAt: string };
}

interface Message {
  id: string;
  role: string;
  content: string;
  channel: string;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

const CHANNEL_META: Record<string, { emoji: string; label: string }> = {
  VOICE: { emoji: "📞", label: "Voice Call" },
  WHATSAPP: { emoji: "💬", label: "WhatsApp" },
};

function channelEmoji(channel: string) {
  return CHANNEL_META[channel]?.emoji ?? "💬";
}

function channelLabel(channel: string) {
  return CHANNEL_META[channel]?.label ?? formatEnum(channel);
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityPage() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  // Detail view
  const [selectedConv, setSelectedConv] = useState<ConversationPreview | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgMeta, setMsgMeta] = useState<PaginationMeta | null>(null);
  const [msgPage, setMsgPage] = useState(1);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<ConversationPreview[]>(`/conversations?page=${page}&limit=20`).then((res) => {
      if (res.success && res.data) {
        setConversations(res.data);
        if (res.meta) setMeta(res.meta as unknown as PaginationMeta);
      }
      setLoading(false);
    });
  }, [page]);

  useEffect(() => {
    if (!selectedConv) return;
    setLoadingMessages(true);
    apiFetch<Message[]>(
      `/conversations/${selectedConv.id}/messages?page=${msgPage}&limit=50`
    ).then((res) => {
      if (res.success && res.data) {
        setMessages(res.data);
        if (res.meta) setMsgMeta(res.meta as unknown as PaginationMeta);
      }
      setLoadingMessages(false);
    });
  }, [selectedConv, msgPage]);

  const openConversation = (conv: ConversationPreview) => {
    setSelectedConv(conv);
    setMsgPage(1);
    setMessages([]);
  };

  const closeDetail = () => {
    setSelectedConv(null);
    setMessages([]);
    setMsgMeta(null);
  };

  const filtered =
    filter === "ALL" ? conversations : conversations.filter((c) => c.channel === filter);
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;
  const msgTotalPages = msgMeta ? Math.ceil(msgMeta.total / msgMeta.limit) : 1;

  // ─── Detail view ───────────────────────────────────────
  if (selectedConv) {
    return (
      <div className="space-y-8">
        {/* Back + title */}
        <div className="flex items-center gap-3">
          <button
            onClick={closeDetail}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">
              {channelLabel(selectedConv.channel)}
            </h1>
            <p className="text-base text-muted-foreground mt-0.5">
              {formatFullDate(selectedConv.startedAt)} at {formatTime(selectedConv.startedAt)}
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="rounded-[20px] border border-border/50 bg-card/80 backdrop-blur-xl p-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-[32px]">{channelEmoji(selectedConv.channel)}</span>
              <div>
                <p className="text-[24px] font-bold tracking-tight leading-none">
                  {channelLabel(selectedConv.channel)}
                </p>
                <p className="text-[14px] text-muted-foreground mt-1">Channel</p>
              </div>
            </div>

            <div className="h-10 w-px bg-border" />

            {msgMeta && (
              <div>
                <p className="text-[24px] font-bold tracking-tight leading-none">
                  {msgMeta.total}
                </p>
                <p className="text-[14px] text-muted-foreground mt-1">
                  message{msgMeta.total !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            <div className="h-10 w-px bg-border" />

            <div>
              <p className="text-[24px] font-bold tracking-tight leading-none">
                {formatTime(selectedConv.startedAt)}
              </p>
              <p className="text-[14px] text-muted-foreground mt-1">Started</p>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div>
          <p className="text-[14px] text-muted-foreground font-medium mb-4">Transcript</p>
          <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl divide-y divide-border/50 overflow-hidden">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[17px] text-muted-foreground">No messages in this conversation.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-4 px-6 py-5">
                  <div className="flex-shrink-0 pt-0.5">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center",
                        msg.role === "USER"
                          ? "bg-foreground text-background"
                          : "bg-accent border border-border/50"
                      )}
                    >
                      {msg.role === "USER" ? (
                        <span className="text-[13px] font-semibold">You</span>
                      ) : (
                        <AuraLogo className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[15px] font-medium">
                        {msg.role === "USER" ? "You" : "Aura"}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message pagination */}
          {msgTotalPages > 1 && (
            <div className="flex items-center justify-center gap-6 mt-4">
              <button
                onClick={() => setMsgPage((p) => Math.max(1, p - 1))}
                disabled={msgPage <= 1}
                className="text-[14px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <span className="text-[13px] text-muted-foreground">
                Page {msgPage} of {msgTotalPages}
              </span>
              <button
                onClick={() => setMsgPage((p) => Math.min(msgTotalPages, p + 1))}
                disabled={msgPage >= msgTotalPages}
                className="text-[14px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── List view ─────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Activity</h1>
          <p className="text-base text-muted-foreground mt-1">
            All your conversations with Aura, across every channel.
          </p>
        </div>
        {meta && (
          <span className="text-[14px] text-muted-foreground">
            {meta.total} total
          </span>
        )}
      </div>

      {/* Channel filter pills */}
      <div>
        <p className="text-[14px] text-muted-foreground font-medium mb-3">Filter by channel</p>
        <div className="flex gap-2.5">
          {[
            { key: "ALL", label: "All", emoji: "📋" },
            { key: "VOICE", label: "Voice", emoji: "📞" },
            { key: "WHATSAPP", label: "WhatsApp", emoji: "💬" },
          ].map((ch) => (
            <button
              key={ch.key}
              onClick={() => setFilter(ch.key)}
              className={cn(
                "flex items-center gap-2 rounded-[12px] border px-4 py-2.5 text-[15px] transition-all duration-200",
                filter === ch.key
                  ? "bg-foreground text-background border-transparent shadow-md"
                  : "border-border/50 hover:border-foreground/20 hover:bg-accent"
              )}
            >
              <span className="text-lg">{ch.emoji}</span>
              <span>{ch.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list — macOS grouped style */}
      {loading ? (
        <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl py-16 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl py-16 text-center">
          <p className="text-[17px] text-muted-foreground">
            {filter === "ALL" ? "No conversations yet" : `No ${channelLabel(filter).toLowerCase()} conversations`}
          </p>
          <p className="text-[14px] text-muted-foreground/60 mt-1">
            When Aura reaches out via voice or WhatsApp, conversations will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl divide-y divide-border/50 overflow-hidden">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left transition-all duration-200 hover:bg-accent/50"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-[24px] flex-shrink-0">
                  {channelEmoji(conv.channel)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-medium">
                      {channelLabel(conv.channel)}
                    </p>
                    <span className="text-[13px] text-muted-foreground">
                      {formatTime(conv.startedAt)}
                    </span>
                  </div>
                  {conv.lastMessage ? (
                    <p className="text-[14px] text-muted-foreground mt-0.5 truncate">
                      {conv.lastMessage.role === "USER" ? "You" : "Aura"}:{" "}
                      {conv.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-[14px] text-muted-foreground/60 mt-0.5">
                      No messages
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                <span className="text-[13px] text-muted-foreground">
                  {formatRelativeDate(conv.lastMessage?.createdAt ?? conv.startedAt)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-[14px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-[13px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-[14px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
