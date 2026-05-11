"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain, Code2, Sparkles, Zap, Shield, BarChart3,
  ArrowRight, GitBranch, Layers, Search, ChevronRight
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Progressive AI Hints",
    description: "5-level hint system that guides without spoiling. From conceptual nudges to implementation guidance.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: GitBranch,
    title: "AST Code Analysis",
    description: "Tree-sitter powered analysis detects patterns, bugs, and optimization opportunities in your code.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Search,
    title: "Hybrid RAG Retrieval",
    description: "FAISS + BM25 retrieval finds relevant patterns, edge cases, and common mistakes for your problem.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Zap,
    title: "Complexity Engine",
    description: "Hybrid static + LLM analysis estimates time and space complexity with optimization suggestions.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Shield,
    title: "AI Guardrails",
    description: "Anti-leakage detection prevents solution spoiling. Prompt injection detection keeps interactions safe.",
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-400",
  },
  {
    icon: Layers,
    title: "Multi-Provider LLM",
    description: "OpenAI + Anthropic with automatic failover. Retry logic ensures reliable AI responses.",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-400",
  },
];

const techStack = [
  { name: "Next.js 15", category: "Frontend" },
  { name: "FastAPI", category: "AI Service" },
  { name: "LangChain", category: "LLM" },
  { name: "Tree-sitter", category: "AST" },
  { name: "FAISS", category: "Vector DB" },
  { name: "Redis", category: "Cache" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Docker", category: "Deploy" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[hsl(var(--border)/.5)] bg-[hsl(var(--background)/.6)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold">CodeMentor AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
          <div className="absolute -right-40 top-20 h-80 w-80 rounded-full bg-blue-600/15 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-purple-600/10 blur-[80px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
              <span className="text-[hsl(var(--muted-foreground))]">AI-Powered Coding Mentor</span>
              <ChevronRight className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Master Algorithms with{" "}
              <span className="gradient-text">Intelligent Guidance</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-[hsl(var(--muted-foreground))] leading-relaxed">
              An AI coding mentor that understands your code deeply. Progressive hints,
              AST analysis, complexity insights, and RAG-powered context — all without spoiling the solution.
            </p>

            {/* CTA */}
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/problems/two-sum"
                className="group flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-all"
              >
                Try the Workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Create Account
              </Link>
            </div>
          </motion.div>

          {/* Floating code snippet preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mx-auto mt-16 max-w-4xl"
          >
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-2xl shadow-violet-600/5">
              <div className="flex items-center gap-1.5 px-4 py-2.5">
                <div className="h-3 w-3 rounded-full bg-rose-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
                <span className="ml-2 text-xs text-[hsl(var(--muted-foreground))]">workspace — two-sum</span>
              </div>
              <div className="grid grid-cols-3 gap-px rounded-b-xl bg-[hsl(var(--border))] overflow-hidden">
                {/* Code panel */}
                <div className="col-span-2 bg-[hsl(var(--background))] p-4">
                  <pre className="text-xs leading-5 text-[hsl(var(--foreground)/.8)]">
{`def twoSum(nums, target):
    `}<span className="text-[hsl(var(--muted-foreground))]"># Brute force - O(n²)</span>{`
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]`}
                  </pre>
                </div>
                {/* AI hint panel */}
                <div className="bg-[hsl(var(--card))] p-4 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
                    <span className="text-[10px] font-semibold">AI Mentor</span>
                  </div>
                  <div className="rounded-lg bg-[hsl(var(--background))] p-2.5 text-[11px] leading-4 text-[hsl(var(--foreground)/.8)]">
                    🤔 Think about what data structure allows <strong className="text-[hsl(var(--primary))]">O(1) lookups</strong>...
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="rounded-md bg-rose-500/10 px-2 py-1.5 text-center">
                      <div className="text-[9px] text-[hsl(var(--muted-foreground))]">Time</div>
                      <div className="text-[11px] font-bold text-rose-400">O(n²)</div>
                    </div>
                    <div className="rounded-md bg-emerald-500/10 px-2 py-1.5 text-center">
                      <div className="text-[9px] text-[hsl(var(--muted-foreground))]">Space</div>
                      <div className="text-[11px] font-bold text-emerald-400">O(1)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Intelligent Features, Not Just Wrappers</h2>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">
            Deep code understanding powered by AST analysis, hybrid RAG, and multi-provider LLMs.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 hover:border-[hsl(var(--primary)/.3)] transition-colors"
              >
                <div className={`inline-flex rounded-lg bg-gradient-to-br ${feature.gradient} p-2.5`}>
                  <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                </div>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold mb-10">Production-Grade Architecture</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2"
              >
                <Code2 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                <span className="text-sm font-medium">{tech.name}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{tech.category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h2 className="text-3xl font-bold">Ready to Level Up?</h2>
        <p className="mt-3 text-[hsl(var(--muted-foreground))]">
          Start solving problems with an AI mentor that actually understands your code.
        </p>
        <Link
          href="/problems/two-sum"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Launch Workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-8">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold">CodeMentor AI</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Built with Next.js, FastAPI, LangChain, and Tree-sitter
          </p>
        </div>
      </footer>
    </div>
  );
}
