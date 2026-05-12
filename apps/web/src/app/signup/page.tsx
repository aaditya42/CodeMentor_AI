"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { authService } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | string[]>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.register(email, username, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      router.push("/dashboard");
    } catch (err: any) {
      const issues = err.response?.data?.details?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        setError(issues.map((issue: any) => issue.message));
      } else {
        setError(err.response?.data?.error || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-40 bottom-1/4 h-80 w-80 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md px-4">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold">CodeMentor AI</span>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8">
          <h1 className="text-xl font-bold text-center">Create your account</h1>
          <p className="mt-1 text-center text-sm text-[hsl(var(--muted-foreground))]">Start mastering algorithms today</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 text-sm text-rose-400">
                {Array.isArray(error) ? (
                  error.map((msg, idx) => (
                    <div key={idx}>{msg}</div>
                  ))
                ) : (
                  error
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Username</label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="coder123" required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="you@example.com" required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="••••••••" required minLength={8}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[hsl(var(--primary))] hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}