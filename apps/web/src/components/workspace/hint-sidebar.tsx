"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, ChevronDown, ChevronRight, Clock, Zap, Brain,
  AlertTriangle, CheckCircle2, TrendingUp, Eye, Lightbulb, Code2
} from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { cn } from "@/lib/utils";

const HINT_LEVEL_META = [
  { level: 1, label: "Conceptual", icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/10" },
  { level: 2, label: "Directional", icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
  { level: 3, label: "Pseudocode", icon: Code2, color: "text-amber-400", bg: "bg-amber-500/10" },
  { level: 4, label: "Optimization", icon: Zap, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { level: 5, label: "Implementation", icon: Eye, color: "text-rose-400", bg: "bg-rose-500/10" },
];

interface HintSidebarProps {
  problem: {
    id: string;
    title: string;
    description: string;
  };
}

export function HintSidebar({ problem }: HintSidebarProps) {
  const {
    hints, currentHintLevel, isStreamingHint, streamingContent,
    astAnalysis, complexityAnalysis,
    setIsStreamingHint, setStreamingContent, appendStreamingContent, addHint,
    setASTAnalysis, setComplexityAnalysis,
    code, language,
  } = useWorkspaceStore();

  const [userMessage, setUserMessage] = useState("");
  const [loadingText, setLoadingText] = useState("Generating AI hint...");
  const [analysisOpen, setAnalysisOpen] = useState(true);
  const [retrievalOpen, setRetrievalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hints, streamingContent]);

  const handleRequestHint = async () => {
    if (isStreamingHint || !code.trim()) return;

    setIsStreamingHint(true);
    setStreamingContent("");
    setLoadingText("Generating AI hint...");

    // Add user message to chat
    if (userMessage.trim()) {
      addHint({
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage.trim(),
        timestamp: Date.now(),
      });
    }

    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

      const response = await fetch(`${API_BASE}/hints/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
          requestedLevel: currentHintLevel,
          userMessage: userMessage.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
          "AI service temporarily unavailable. Please retry shortly."
        );
      }

      // AST Analysis
      if (result?.data?.analysis) {
        setASTAnalysis(result.data.analysis);
      }

      // Complexity Analysis
      if (result?.data?.complexity) {
        setComplexityAnalysis(result.data.complexity);
      }

      // Hint Content
      if (result?.data?.content) {
        addHint({
          id: `hint-${Date.now()}`,
          role: "assistant",
          content: result.data.content,
          hintLevel: result.data.hintLevel,
          timestamp: Date.now(),
        });
      }
    } catch (error: any) {
      addHint({
        id: `hint-${Date.now()}`,
        role: "assistant",
        content:
          error.message ||
          "AI service temporarily unavailable. Please retry shortly.",
        timestamp: Date.now(),
      });
    } finally {
      setIsStreamingHint(false);
      setStreamingContent("");
      setUserMessage("");
    }
  };

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--card))]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--primary)/.15)]">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          </div>
          <span className="text-sm font-semibold">AI Mentor</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded">
            Level {currentHintLevel}/5
          </span>
        </div>
      </div>

      {/* Hint progression timeline */}
      <div className="flex items-center gap-1 border-b border-[hsl(var(--border))] px-4 py-2">
        {HINT_LEVEL_META.map((meta, i) => {
          const Icon = meta.icon;
          const isCompleted = hints.some((h) => h.hintLevel === meta.level);
          const isCurrent = meta.level === currentHintLevel;
          return (
            <div key={meta.level} className="flex items-center gap-1">
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full transition-all",
                isCompleted ? `${meta.bg} ${meta.color}` :
                  isCurrent ? "border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)]" :
                    "border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]",
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </div>
              {i < 4 && <div className={cn(
                "h-px w-3",
                isCompleted ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"
              )} />}
            </div>
          );
        })}
        <span className="ml-1 text-[10px] text-[hsl(var(--muted-foreground))]">
          {HINT_LEVEL_META[currentHintLevel - 1]?.label}
        </span>
      </div>

      {/* Analysis cards (collapsible) */}
      {(astAnalysis || complexityAnalysis) && (
        <div className="border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setAnalysisOpen(!analysisOpen)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <span className="flex items-center gap-1.5">
              <Brain className="h-3 w-3" />
              Code Analysis
            </span>
            {analysisOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          <AnimatePresence>
            {analysisOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 px-4 pb-3">
                  {/* Complexity */}
                  {complexityAnalysis && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className={cn(
                        "rounded-lg border px-3 py-2",
                        complexityAnalysis.isTLEProne
                          ? "border-rose-500/30 bg-rose-500/5"
                          : "border-emerald-500/30 bg-emerald-500/5"
                      )}>
                        <div className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Time</div>
                        <div className={cn(
                          "text-sm font-bold",
                          complexityAnalysis.isTLEProne ? "text-rose-400" : "text-emerald-400"
                        )}>
                          {complexityAnalysis.timeComplexity}
                        </div>
                      </div>
                      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2">
                        <div className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Space</div>
                        <div className="text-sm font-bold text-[hsl(var(--foreground))]">
                          {complexityAnalysis.spaceComplexity}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pattern badge */}
                  {astAnalysis && (
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[hsl(var(--primary)/.1)] px-2 py-1 text-xs font-medium text-[hsl(var(--primary))]">
                        {astAnalysis.algorithmPattern}
                      </span>
                      {complexityAnalysis?.isTLEProne && (
                        <span className="flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400">
                          <AlertTriangle className="h-3 w-3" />
                          TLE Risk
                        </span>
                      )}
                    </div>
                  )}

                  {/* Optimization suggestion */}
                  {complexityAnalysis?.suggestions[0] && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        Optimization Available
                      </div>
                      <div className="mt-1 text-xs text-[hsl(var(--foreground)/.8)]">
                        {complexityAnalysis.suggestions[0].from} → <span className="text-emerald-400 font-semibold">{complexityAnalysis.suggestions[0].to}</span>
                        <span className="text-[hsl(var(--muted-foreground))]"> via {complexityAnalysis.suggestions[0].technique}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Retrieval Transparency (collapsible) */}
      <div className="border-b border-[hsl(var(--border))]">
        <button
          onClick={() => setRetrievalOpen(!retrievalOpen)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <span className="flex items-center gap-1.5">
            <Eye className="h-3 w-3" />
            Retrieved Context
          </span>
          {retrievalOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <AnimatePresence>
          {retrievalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-4 pb-3"
            >
              <div className="space-y-1.5">
                {["Hash Table pattern: O(1) lookup", "Two Sum: complement search", "Edge case: duplicate values"].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-[hsl(var(--background))] px-2.5 py-1.5">
                    <span className="text-xs text-[hsl(var(--foreground)/.8)] truncate">{doc}</span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-2">0.{9 - i}{i + 2}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {hints.length === 0 && !isStreamingHint && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary)/.1)]">
              <Sparkles className="h-6 w-6 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <p className="text-sm font-medium">Ready to help!</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Write some code, then ask for a hint.<br />
                Hints get progressively more detailed.
              </p>
            </div>
          </div>
        )}

        {hints.map((hint) => (
          <motion.div
            key={hint.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-lg p-3",
              hint.role === "user"
                ? "ml-6 bg-[hsl(var(--primary)/.15)] border border-[hsl(var(--primary)/.2)]"
                : "mr-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
            )}
          >
            {hint.role === "assistant" && hint.hintLevel && (
              <div className="flex items-center gap-1.5 mb-2">
                {(() => {
                  const meta = HINT_LEVEL_META[hint.hintLevel - 1];
                  const Icon = meta?.icon || Lightbulb;
                  return (
                    <>
                      <Icon className={cn("h-3 w-3", meta?.color)} />
                      <span className={cn("text-[10px] font-semibold", meta?.color)}>
                        Level {hint.hintLevel}: {meta?.label}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {hint.content.split('```').map((part, i) =>
                i % 2 === 0 ? (
                  <span key={i}>{part.replace(/\*\*(.*?)\*\*/g, '«$1»').split('«').map((seg, j) =>
                    j % 2 === 0 ? seg : <strong key={j} className="text-[hsl(var(--primary))]">{seg.replace('»', '')}</strong>
                  )}</span>
                ) : (
                  <pre key={i} className="my-2 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-2.5 text-xs overflow-x-auto">
                    <code>{part.replace(/^\w+\n/, '')}</code>
                  </pre>
                )
              )}
            </div>
          </motion.div>
        ))}

        {/* Streaming content */}
        {isStreamingHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mr-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] font-semibold text-[hsl(var(--primary))] animate-pulse">{loadingText}</span>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap streaming-cursor">
              {streamingContent}
            </div>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[hsl(var(--border))] p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRequestHint()}
            placeholder={`Ask for Level ${currentHintLevel} hint...`}
            className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
            disabled={isStreamingHint}
          />
          <button
            onClick={handleRequestHint}
            disabled={isStreamingHint || !code.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isStreamingHint ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
