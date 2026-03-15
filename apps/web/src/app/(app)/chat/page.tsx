"use client";

import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Send, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "USER", content, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setSending(true);

    const res = await apiFetch<{
      message: Message;
      response: Message;
      conversationId: string;
    }>("/conversations/message", {
      method: "POST",
      body: JSON.stringify({ content, channel: "WEB" }),
    });

    if (res.success && res.data) {
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return [...without, res.data!.message, res.data!.response];
      });
    } else {
      const errorDetail = res.error?.message ?? "Unknown error";
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "ASSISTANT",
          content: `Sorry, something went wrong: ${errorDetail}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-foreground flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-background" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Chat with Aura</h1>
            <p className="text-2xs text-muted-foreground mt-0.5">Your messages are private</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-pulse" />
          <span className="text-2xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">Start a conversation</p>
            <p className="text-sm text-center max-w-xs">
              Send a message below to chat with Aura. I&apos;m here to help you crush your goals!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "USER" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm transition-all",
                msg.role === "USER" ? "chat-user rounded-br-md" : "chat-assistant rounded-bl-md"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  msg.role === "USER" ? "text-primary-foreground/60" : "text-muted-foreground"
                )}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md chat-assistant px-4 py-3">
              <div className="flex gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 pb-1">
        <form
          onSubmit={sendMessage}
          className="relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm focus-within:ring-2 focus-within:ring-ring/20 focus-within:border-foreground/20 transition-all"
        >
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Message Aura..."
            rows={1}
            disabled={sending}
            className="w-full resize-none bg-transparent pl-4 pr-14 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:opacity-80 hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
