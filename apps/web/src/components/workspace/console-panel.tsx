"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, TestTube, FileWarning, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { cn } from "@/lib/utils";

const consoleTabs = [
  { id: "testcases", label: "Test Cases", icon: TestTube },
  { id: "output", label: "Output", icon: Terminal },
  { id: "edge-cases", label: "Edge Cases", icon: FileWarning },
];

interface ConsolePanelProps {
  testCases: Array<{ id: string; input: string; expected: string; isHidden: boolean }>;
}

const VERDICT_CONFIG = {
  ACCEPTED: { icon: CheckCircle2, label: "Accepted", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  WRONG_ANSWER: { icon: XCircle, label: "Wrong Answer", color: "text-rose-400", bg: "bg-rose-500/10" },
  RUNTIME_ERROR: { icon: AlertTriangle, label: "Runtime Error", color: "text-rose-400", bg: "bg-rose-500/10" },
  TIME_LIMIT_EXCEEDED: { icon: Clock, label: "Time Limit Exceeded", color: "text-amber-400", bg: "bg-amber-500/10" },
  COMPILATION_ERROR: { icon: AlertTriangle, label: "Compilation Error", color: "text-rose-400", bg: "bg-rose-500/10" },
  PENDING: { icon: Clock, label: "Running...", color: "text-blue-400", bg: "bg-blue-500/10" },
};

export function ConsolePanel({ testCases }: ConsolePanelProps) {
  const { activeConsoleTab, setActiveConsoleTab, executionResult, isExecuting, astAnalysis } = useWorkspaceStore();
  const [selectedTestCase, setSelectedTestCase] = useState(0);

  const verdict = executionResult ? VERDICT_CONFIG[executionResult.status] : null;

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--card))]">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2">
        <div className="flex">
          {consoleTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveConsoleTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2",
                  activeConsoleTab === tab.id
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--foreground))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Execution status badge */}
        {isExecuting && (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            <span className="text-[10px] font-medium text-blue-400">Running...</span>
          </div>
        )}
        {verdict && !isExecuting && (
          <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1", verdict.bg)}>
            <verdict.icon className={cn("h-3 w-3", verdict.color)} />
            <span className={cn("text-[10px] font-medium", verdict.color)}>{verdict.label}</span>
            {executionResult?.time && executionResult.time !== "0" && (
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{executionResult.time}ms</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeConsoleTab === "testcases" && (
          <div className="space-y-3">
            {/* Test case selector */}
            <div className="flex gap-1.5">
              {testCases.filter(tc => !tc.isHidden).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTestCase(i)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    selectedTestCase === i
                      ? "bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  Case {i + 1}
                </button>
              ))}
            </div>

            {/* Selected test case */}
            {testCases[selectedTestCase] && (
              <div className="space-y-2">
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                  <div className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mb-1">Input</div>
                  <pre className="text-xs text-[hsl(var(--foreground))] font-mono">{testCases[selectedTestCase].input.replace(/\\n/g, '\n')}</pre>
                </div>
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                  <div className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mb-1">Expected Output</div>
                  <pre className="text-xs text-emerald-400 font-mono">{testCases[selectedTestCase].expected}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeConsoleTab === "output" && (
          <div className="space-y-3">
            {!executionResult && !isExecuting && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Terminal className="h-8 w-8 text-[hsl(var(--muted-foreground))] mb-2" />
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Run your code to see output</p>
              </div>
            )}

            {executionResult && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {/* Verdict banner */}
                  {verdict && (
                    <div className={cn("flex items-center gap-2 rounded-lg p-3", verdict.bg)}>
                      <verdict.icon className={cn("h-5 w-5", verdict.color)} />
                      <div>
                        <p className={cn("text-sm font-semibold", verdict.color)}>{verdict.label}</p>
                        {executionResult.time && executionResult.time !== "0" && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            Runtime: {executionResult.time}ms | Memory: {executionResult.memory ? `${(executionResult.memory / 1024).toFixed(1)} MB` : 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* stdout */}
                  {executionResult.stdout && (
                    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                      <div className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mb-1">Stdout</div>
                      <pre className="text-xs text-[hsl(var(--foreground))] font-mono whitespace-pre-wrap">{executionResult.stdout}</pre>
                    </div>
                  )}

                  {/* stderr */}
                  {executionResult.stderr && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                      <div className="text-[10px] font-semibold text-rose-400 mb-1">Stderr</div>
                      <pre className="text-xs text-rose-300 font-mono whitespace-pre-wrap">{executionResult.stderr}</pre>
                    </div>
                  )}

                  {/* Compilation output */}
                  {executionResult.compileOutput && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="text-[10px] font-semibold text-amber-400 mb-1">Compilation Output</div>
                      <pre className="text-xs text-amber-300 font-mono whitespace-pre-wrap">{executionResult.compileOutput}</pre>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

        {activeConsoleTab === "edge-cases" && (
          <div className="space-y-2">
            {astAnalysis?.issues.length ? (
              astAnalysis.issues.map((issue, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2.5",
                    issue.severity === "error"
                      ? "border-rose-500/20 bg-rose-500/5"
                      : "border-amber-500/20 bg-amber-500/5"
                  )}
                >
                  <AlertTriangle className={cn(
                    "h-3.5 w-3.5 mt-0.5 shrink-0",
                    issue.severity === "error" ? "text-rose-400" : "text-amber-400"
                  )} />
                  <div>
                    <p className="text-xs font-medium text-[hsl(var(--foreground))]">{issue.message}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">{issue.type} • {issue.severity}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400/50 mb-2" />
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Request an AI hint to detect edge cases</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
