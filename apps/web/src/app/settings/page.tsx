"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Moon, Sun, Save, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/shared/navbar";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Manage your account preferences</p>
        </motion.div>

        <div className="mt-8 space-y-6">
          {/* Profile */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-[hsl(var(--primary))]" />
              Profile
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Email</label>
                <input
                  type="email" value={user?.email || "demo@codementor.ai"} disabled
                  className="mt-1.5 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-2.5 text-sm text-[hsl(var(--muted-foreground))]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Display Name</label>
                <input
                  type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                  placeholder="Your display name"
                />
              </div>
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <h2 className="text-sm font-semibold mb-4">Appearance</h2>
            <div className="flex gap-3">
              {[
                { value: "dark", label: "Dark", icon: Moon },
                { value: "light", label: "Light", icon: Sun },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                      theme === opt.value
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"
                        : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
