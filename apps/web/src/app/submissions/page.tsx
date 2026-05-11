"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Code2 } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { cn } from "@/lib/utils";

const DEMO_SUBMISSIONS = [
  { id: "1", problem: "Two Sum", language: "Python", status: "ACCEPTED", runtime: 45, memory: 16.2, date: "2025-01-15" },
  { id: "2", problem: "Two Sum", language: "Python", status: "WRONG_ANSWER", runtime: 0, memory: 0, date: "2025-01-15" },
  { id: "3", problem: "Valid Parentheses", language: "C++", status: "ACCEPTED", runtime: 2, memory: 7.1, date: "2025-01-14" },
  { id: "4", problem: "Add Two Numbers", language: "Java", status: "TIME_LIMIT_EXCEEDED", runtime: 0, memory: 0, date: "2025-01-13" },
  { id: "5", problem: "Longest Substring", language: "Python", status: "RUNTIME_ERROR", runtime: 0, memory: 0, date: "2025-01-12" },
];

const STATUS_MAP = {
  ACCEPTED: { icon: CheckCircle2, label: "Accepted", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  WRONG_ANSWER: { icon: XCircle, label: "Wrong Answer", color: "text-rose-400", bg: "bg-rose-500/10" },
  TIME_LIMIT_EXCEEDED: { icon: Clock, label: "TLE", color: "text-amber-400", bg: "bg-amber-500/10" },
  RUNTIME_ERROR: { icon: AlertTriangle, label: "Runtime Error", color: "text-rose-400", bg: "bg-rose-500/10" },
};

export default function SubmissionsPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Submission History</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Track your progress across all problems</p>
        </motion.div>

        <div className="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_100px_80px_80px_90px] gap-4 border-b border-[hsl(var(--border))] px-4 py-2.5 text-xs font-medium text-[hsl(var(--muted-foreground))]">
            <span>Problem</span><span>Language</span><span>Status</span><span>Runtime</span><span>Memory</span><span>Date</span>
          </div>
          {DEMO_SUBMISSIONS.map((sub, i) => {
            const status = STATUS_MAP[sub.status as keyof typeof STATUS_MAP];
            const Icon = status?.icon || Clock;
            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-[1fr_80px_100px_80px_80px_90px] gap-4 items-center border-b border-[hsl(var(--border)/.5)] px-4 py-3 hover:bg-[hsl(var(--muted)/.3)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                  <span className="text-sm font-medium truncate">{sub.problem}</span>
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{sub.language}</span>
                <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 w-fit text-xs font-medium", status?.bg)}>
                  <Icon className={cn("h-3 w-3", status?.color)} />
                  <span className={status?.color}>{status?.label}</span>
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{sub.runtime ? `${sub.runtime}ms` : "—"}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{sub.memory ? `${sub.memory}MB` : "—"}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{sub.date}</span>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
