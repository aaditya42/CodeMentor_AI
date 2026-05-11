"use client";

import { useState } from "react";
import { FileText, BookOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProblemPanelProps {
  problem: {
    title: string;
    description: string;
    difficulty: string;
    topics: string[];
    constraints: string;
    examples: Array<{ input: string; output: string; explanation?: string }>;
  };
}

const tabs = [
  { id: "description", label: "Description", icon: FileText },
  { id: "examples", label: "Examples", icon: BookOpen },
  { id: "constraints", label: "Constraints", icon: Zap },
];

export function ProblemPanel({ problem }: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState("description");

  return (
    <div className="flex h-full flex-col bg-[hsl(var(--card))]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[hsl(var(--border))] px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2",
                activeTab === tab.id
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === "description" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{problem.title}</h2>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                problem.difficulty === "EASY" && "bg-emerald-500/15 text-emerald-400",
                problem.difficulty === "MEDIUM" && "bg-amber-500/15 text-amber-400",
                problem.difficulty === "HARD" && "bg-rose-500/15 text-rose-400",
              )}>
                {problem.difficulty}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {problem.topics.map((topic) => (
                <span key={topic} className="rounded-md bg-[hsl(var(--primary)/.1)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--primary))]">
                  {topic}
                </span>
              ))}
            </div>

            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-[hsl(var(--foreground)/.85)]">
              {problem.description.split('\n').map((paragraph, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "examples" && (
          <div className="space-y-4">
            {problem.examples.map((example, i) => (
              <div key={i} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                <div className="border-b border-[hsl(var(--border))] px-3 py-2">
                  <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Example {i + 1}</span>
                </div>
                <div className="space-y-2 p-3">
                  <div>
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Input: </span>
                    <code className="text-xs text-[hsl(var(--foreground))]">{example.input}</code>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Output: </span>
                    <code className="text-xs text-emerald-400">{example.output}</code>
                  </div>
                  {example.explanation && (
                    <div className="pt-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium">Explanation: </span>
                      {example.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "constraints" && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Constraints</h3>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
              {problem.constraints.split('\n').map((c, i) => (
                <p key={i} className="text-xs text-[hsl(var(--muted-foreground))] py-0.5">
                  • <code className="text-[hsl(var(--foreground))]">{c}</code>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
