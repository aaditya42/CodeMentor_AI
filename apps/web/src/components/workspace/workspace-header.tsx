"use client";

import Link from "next/link";
import { Brain, Play, Send, ChevronLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { executionService } from "@/services/api";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "PYTHON", label: "Python" },
  { value: "CPP", label: "C++" },
  { value: "JAVA", label: "Java" },
];

export function WorkspaceHeader({ problem }: { problem: { title: string; difficulty: string } }) {
  const { language, setLanguage, code, isExecuting, setIsExecuting, setExecutionResult, setActiveConsoleTab } = useWorkspaceStore();
  const { theme, setTheme } = useTheme();

  const difficultyColor = {
    EASY: "text-emerald-400",
    MEDIUM: "text-amber-400",
    HARD: "text-rose-400",
  }[problem.difficulty] || "text-gray-400";

  const handleRun = async () => {
    setIsExecuting(true);
    setActiveConsoleTab("output");
    try {
      const result = await executionService.run(code, language, []);
      setExecutionResult(result);
    } catch {
      setExecutionResult({
        status: "RUNTIME_ERROR",
        stdout: "",
        stderr: "Failed to connect to execution service",
        compileOutput: "",
        time: "0",
        memory: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
          <ChevronLeft className="h-4 w-4" />
          <Brain className="h-4 w-4 text-[hsl(var(--primary))]" />
        </Link>
        <div className="h-4 w-px bg-[hsl(var(--border))]" />
        <h1 className="text-sm font-semibold truncate max-w-[200px]">{problem.title}</h1>
        <span className={cn("text-xs font-medium", difficultyColor)}>{problem.difficulty}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as any)}
          className="h-8 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
        >
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        <div className="h-4 w-px bg-[hsl(var(--border))]" />

        {/* Run */}
        <button
          onClick={handleRun}
          disabled={isExecuting}
          className="flex h-8 items-center gap-1.5 rounded-md border border-[hsl(var(--border))] px-3 text-xs font-medium hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
        >
          <Play className="h-3 w-3" />
          {isExecuting ? "Running..." : "Run"}
        </button>

        {/* Submit */}
        <button
          disabled={isExecuting}
          className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
          Submit
        </button>
      </div>
    </header>
  );
}
