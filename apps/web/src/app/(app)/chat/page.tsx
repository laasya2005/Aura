"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AuraLogo } from "@/components/ui/aura-logo";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface ConversationPreview {
  id: string;
  startedAt: string;
  lastMessage?: { content: string; role: string; createdAt: string };
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let currentLabel = "";

  for (const msg of messages) {
    const label = getDateLabel(msg.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [] });
    }
    groups[groups.length - 1]!.messages.push(msg);
  }

  return groups;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 200;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottom()) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [isNearBottom]);

  // Load latest conversation and messages
  useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      const convRes = await apiFetch<ConversationPreview[]>("/conversations?limit=1");
      if (convRes.success && convRes.data && convRes.data.length > 0) {
        const conv = convRes.data[0]!;
        setConversationId(conv.id);

        const msgRes = await apiFetch<Message[]>(
          `/conversations/${conv.id}/messages?limit=50`
        );
        if (msgRes.success && msgRes.data) {
          setMessages(msgRes.data);
        }
      }
      setLoadingHistory(false);
      // Scroll to bottom after initial load
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      }, 100);
    })();
  }, []);

  // Poll for new messages every 10s
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      if (sending) return;
      const res = await apiFetch<Message[]>(
        `/conversations/${conversationId}/messages?limit=50`
      );
      if (res.success && res.data) {
        setMessages((prev) => {
          if (res.data!.length !== prev.length) {
            return res.data!;
          }
          return prev;
        });
        scrollToBottom();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [conversationId, sending, scrollToBottom]);

  const sendMessage = async () => {
    const content = inputValue.trim();
    if (!content || sending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputValue("");
    setSending(true);
    scrollToBottom(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const res = await apiFetch<{
      conversation: { id: string };
      userMessage: Message;
      assistantMessage: Message;
    }>("/conversations/message", {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    if (res.success && res.data) {
      if (!conversationId) {
        setConversationId(res.data.conversation.id);
      }
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return [...withoutTemp, res.data!.userMessage, res.data!.assistantMessage];
      });
    } else {
      // Remove temp message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }

    setSending(false);
    scrollToBottom(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-grow
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const dateGroups = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Empty state
  if (!loadingHistory && messages.length === 0 && !conversationId) {
    return (
      <div className="flex flex-col h-[100dvh] sm:h-[calc(100vh-48px)]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          <div className="h-9 w-9 rounded-full bg-accent border border-border/50 flex items-center justify-center">
            <AuraLogo className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[16px] font-semibold">Aura</p>
            <p className="text-[13px] text-muted-foreground">Your AI coach</p>
          </div>
        </div>

        {/* Empty state center */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="h-16 w-16 rounded-2xl bg-foreground flex items-center justify-center text-background mb-5">
            <AuraLogo className="h-8 w-8" />
          </div>
          <h2 className="text-[22px] font-bold tracking-tight">Say hello to your AI coach</h2>
          <p className="text-[15px] text-muted-foreground mt-2 text-center max-w-sm">
            Start a conversation and Aura will be here to keep you on track.
          </p>
        </div>

        {/* Input bar */}
        <div className="border-t border-border/50 bg-card/60 backdrop-blur-xl px-4 py-3">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message Aura..."
              rows={1}
              className="flex-1 resize-none rounded-[18px] border border-border bg-background px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 placeholder:text-muted-foreground/50"
              style={{ maxHeight: 120 }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || sending}
              className="flex-shrink-0 h-11 w-11 rounded-full bg-foreground text-background flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] sm:h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
        <div className="h-9 w-9 rounded-full bg-accent border border-border/50 flex items-center justify-center">
          <AuraLogo className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[16px] font-semibold">Aura</p>
          <p className="text-[13px] text-muted-foreground">Your AI coach</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
      >
        {loadingHistory ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
        ) : (
          <>
            {dateGroups.map((group) => (
              <div key={group.label}>
                {/* Date separator */}
                <div className="flex items-center justify-center py-4">
                  <span className="text-[12px] text-muted-foreground/60 font-medium bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>

                {/* Messages in this group */}
                <div className="space-y-1.5">
                  {group.messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role !== "USER" && (
                        <div className="flex-shrink-0 mr-2 mt-1">
                          <div className="h-7 w-7 rounded-full bg-accent border border-border/50 flex items-center justify-center">
                            <AuraLogo className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 ${
                          msg.role === "USER"
                            ? "chat-user rounded-[18px] rounded-br-[4px]"
                            : "chat-assistant rounded-[18px] rounded-bl-[4px]"
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <p
                          className={`text-[11px] mt-1 ${
                            msg.role === "USER"
                              ? "text-primary-foreground/50"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex justify-start"
                >
                  <div className="flex-shrink-0 mr-2 mt-1">
                    <div className="h-7 w-7 rounded-full bg-accent border border-border/50 flex items-center justify-center">
                      <AuraLogo className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="chat-assistant rounded-[18px] rounded-bl-[4px] px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border/50 bg-card/60 backdrop-blur-xl px-4 py-3">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Aura..."
            rows={1}
            className="flex-1 resize-none rounded-[18px] border border-border bg-background px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground/20 placeholder:text-muted-foreground/50"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || sending}
            className="flex-shrink-0 h-11 w-11 rounded-full bg-foreground text-background flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
