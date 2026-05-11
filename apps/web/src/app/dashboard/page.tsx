"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Code2, Trophy, Flame, Target, Clock, Brain,
  ChevronRight, ArrowUpRight, Sparkles
} from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { cn } from "@/lib/utils";

const DEMO_PROBLEMS = [
  { slug: "two-sum", title: "Two Sum", difficulty: "EASY", topics: ["Arrays", "Hash Table"], acceptance: 78 },
  { slug: "add-two-numbers", title: "Add Two Numbers", difficulty: "MEDIUM", topics: ["Linked List", "Math"], acceptance: 42 },
  { slug: "longest-substring", title: "Longest Substring Without Repeating", difficulty: "MEDIUM", topics: ["Sliding Window", "Hash Table"], acceptance: 35 },
  { slug: "median-sorted-arrays", title: "Median of Two Sorted Arrays", difficulty: "HARD", topics: ["Binary Search", "Arrays"], acceptance: 28 },
  { slug: "valid-parentheses", title: "Valid Parentheses", difficulty: "EASY", topics: ["Stack", "Strings"], acceptance: 72 },
  { slug: "merge-intervals", title: "Merge Intervals", difficulty: "MEDIUM", topics: ["Sorting", "Arrays"], acceptance: 48 },
  { slug: "binary-tree-level-order", title: "Binary Tree Level Order", difficulty: "MEDIUM", topics: ["Trees", "BFS"], acceptance: 62 },
  { slug: "word-search", title: "Word Search", difficulty: "MEDIUM", topics: ["Backtracking", "Matrix"], acceptance: 40 },
];

const stats = [
  { label: "Problems Solved", value: "0", icon: Target, color: "text-emerald-400" },
  { label: "Day Streak", value: "0", icon: Flame, color: "text-amber-400" },
  { label: "Hints Used", value: "0", icon: Sparkles, color: "text-violet-400" },
  { label: "Acceptance Rate", value: "—", icon: Trophy, color: "text-blue-400" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Pick a problem and start coding with AI guidance
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{stat.label}</span>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Start */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Problems</h2>
            <div className="flex gap-2">
              {["All", "Easy", "Medium", "Hard"].map((d) => (
                <button
                  key={d}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    d === "All"
                      ? "bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_200px_80px] gap-4 border-b border-[hsl(var(--border))] px-4 py-2.5">
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Title</span>
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Difficulty</span>
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Topics</span>
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] text-right">Solve</span>
            </div>

            {/* Rows */}
            {DEMO_PROBLEMS.map((problem, i) => (
              <motion.div
                key={problem.slug}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/problems/${problem.slug}`}
                  className="grid grid-cols-[1fr_100px_200px_80px] gap-4 items-center px-4 py-3 border-b border-[hsl(var(--border)/.5)] hover:bg-[hsl(var(--muted)/.5)] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    <span className="text-sm font-medium truncate group-hover:text-[hsl(var(--primary))] transition-colors">
                      {problem.title}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs font-semibold",
                    problem.difficulty === "EASY" && "text-emerald-400",
                    problem.difficulty === "MEDIUM" && "text-amber-400",
                    problem.difficulty === "HARD" && "text-rose-400",
                  )}>
                    {problem.difficulty}
                  </span>
                  <div className="flex gap-1 overflow-hidden">
                    {problem.topics.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-md bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <ArrowUpRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
