"use client";

import { useRef, useState, useEffect } from "react";
import { Sparkles, Send, Loader2, RotateCcw, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MultiStepFormConfig } from "@/lib/form-builder-types";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
  appliedConfig?: MultiStepFormConfig;
};

const SUGGESTIONS = [
  "Build a customer satisfaction survey",
  "Create a 3-step NPS form",
  "Add a follow-up question based on the rating",
  "Add a thank-you step that redirects to my website",
  "Make the first step a welcome message",
  "Add an email field to the last step",
];

interface AIFormPanelProps {
  pageId: string;
  currentFormConfig: MultiStepFormConfig;
  onApply: (config: MultiStepFormConfig) => void;
}

export function AIFormPanel({ pageId, currentFormConfig, onApply }: AIFormPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiBlocked, setAiBlocked] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ai-panel-collapsed") === "true";
  });

  const toggleCollapsed = (next: boolean) => {
    setCollapsed(next);
    localStorage.setItem("ai-panel-collapsed", String(next));
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for the API (exclude appliedConfig, just text)
      const conversationHistory = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`/api/feedback-pages/${pageId}/ai-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          currentFormConfig,
          conversationHistory: conversationHistory.slice(0, -1), // exclude the latest user message (sent as prompt)
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "AI_ACCESS_REQUIRED") {
          setAiBlocked(true);
          setMessages((prev) => prev.filter((m) => m !== userMsg));
          return;
        }
        throw new Error(data.error ?? "Request failed");
      }

      const assistantMsg: Message = {
        role: "assistant",
        content: data.assistantMessage ?? "Done! I've updated the form.",
        appliedConfig: data.formConfig,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      onApply(data.formConfig);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, something went wrong: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = messages.length === 0;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center shrink-0 w-10 border-l border-gray-200 bg-white py-3 gap-3">
        <button
          type="button"
          onClick={() => toggleCollapsed(false)}
          title="Expand AI panel"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Sparkles className="h-4 w-4 text-violet-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-[320px] xl:w-[380px] 2xl:w-[440px] shrink-0 border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-sm font-semibold text-gray-700">AI Assistant</span>
        </div>
        <button
          type="button"
          onClick={() => toggleCollapsed(true)}
          title="Collapse AI panel"
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* AI blocked upsell */}
      {aiBlocked && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">AI is a paid add-on</p>
            <p className="text-xs text-gray-500">
              Get the AI form builder for $9/mo — cancel anytime.
            </p>
          </div>
          <Button
            type="button"
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8"
            onClick={() => router.push("/dashboard/settings/billing")}
          >
            Get AI add-on
          </Button>
        </div>
      )}

      {/* Messages */}
      {!aiBlocked && <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isEmpty ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">
              Describe what you want to build or change.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-gray-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gray-900 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {msg.content}
                {msg.role === "assistant" && msg.appliedConfig && (
                  <button
                    type="button"
                    onClick={() => onApply(msg.appliedConfig!)}
                    className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Re-apply this version
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Loader2 className="h-3.5 w-3.5 text-gray-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>}

      {/* Input */}
      {!aiBlocked && <div className="shrink-0 border-t border-gray-200 px-3 py-3">
        <div className="flex gap-2 items-start">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a change…"
            className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder:text-gray-400"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="h-9 w-9 p-0 bg-gray-900 hover:bg-gray-700 shrink-0 mt-px"
          >
            <Send className="h-3.5 w-3.5 text-white" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1.5 text-right">⌘↵ to send</p>
      </div>}
    </div>
  );
}
