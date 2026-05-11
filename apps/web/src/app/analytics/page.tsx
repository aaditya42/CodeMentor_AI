"use client";

import { motion } from "framer-motion";
import { BarChart3, Target, Flame, TrendingUp, Trophy, Sparkles } from "lucide-react";
import { Navbar } from "@/components/shared/navbar";
import { cn } from "@/lib/utils";

const topicData = [
  { name: "Arrays", solved: 5, total: 20, color: "bg-blue-500" },
  { name: "Hash Table", solved: 3, total: 15, color: "bg-violet-500" },
  { name: "Dynamic Programming", solved: 1, total: 25, color: "bg-amber-500" },
  { name: "Trees", solved: 2, total: 18, color: "bg-emerald-500" },
  { name: "Strings", solved: 4, total: 12, color: "bg-rose-500" },
  { name: "Graphs", solved: 0, total: 20, color: "bg-cyan-500" },
];

const difficultyData = [
  { name: "Easy", solved: 8, total: 30, color: "bg-emerald-500" },
  { name: "Medium", solved: 4, total: 50, color: "bg-amber-500" },
  { name: "Hard", solved: 1, total: 20, color: "bg-rose-500" },
];

const weeklyActivity = [3, 5, 2, 7, 4, 6, 1]; // Last 7 days

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Your coding progress at a glance</p>
        </motion.div>

        {/* Overview cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Solved", value: "13", icon: Target, color: "text-emerald-400", change: "+3 this week" },
            { label: "Day Streak", value: "7", icon: Flame, color: "text-amber-400", change: "Personal best!" },
            { label: "Hints Used", value: "24", icon: Sparkles, color: "text-violet-400", change: "Avg 1.8/problem" },
            { label: "Acceptance", value: "62%", icon: Trophy, color: "text-blue-400", change: "+5% vs last week" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{stat.label}</span>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{stat.change}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Topic breakdown */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
              Topic Progress
            </h3>
            <div className="mt-4 space-y-3">
              {topicData.map((topic) => (
                <div key={topic.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{topic.name}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{topic.solved}/{topic.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className={cn("h-full rounded-full transition-all", topic.color)}
                      style={{ width: `${(topic.solved / topic.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty + weekly */}
          <div className="space-y-4">
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
                Difficulty Breakdown
              </h3>
              <div className="mt-4 space-y-3">
                {difficultyData.map((d) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-medium">{d.name}</span>
                    <div className="flex-1 h-6 rounded-md bg-[hsl(var(--muted))] overflow-hidden">
                      <div className={cn("h-full rounded-md flex items-center px-2", d.color)} style={{ width: `${(d.solved / d.total) * 100}%` }}>
                        <span className="text-[10px] font-bold text-white">{d.solved}</span>
                      </div>
                    </div>
                    <span className="w-8 text-xs text-[hsl(var(--muted-foreground))] text-right">{d.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />
                Weekly Activity
              </h3>
              <div className="mt-4 flex items-end gap-1.5 h-20">
                {weeklyActivity.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-[hsl(var(--primary))] transition-all"
                      style={{ height: `${(v / 7) * 100}%` }}
                    />
                    <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
