"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { AuraLogo } from "@/components/ui/aura-logo";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
    const body =
      mode === "register"
        ? JSON.stringify({ email, password, firstName })
        : JSON.stringify({ email, password });

    const res = await apiFetch<{
      accessToken: string;
      user: { id: string; plan: string; isNew: boolean; status: string; firstName?: string };
    }>(endpoint, { method: "POST", body });

    setLoading(false);

    if (res.success && res.data) {
      await login(res.data.accessToken, "", res.data.user);

      if (res.data.user.status === "ONBOARDING") {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(
        res.error?.message ?? (mode === "register" ? "Registration failed" : "Invalid credentials")
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 relative">
      {/* Background */}
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>

      <div className="relative z-10 w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-foreground flex items-center justify-center text-background shadow-xl">
            <AuraLogo className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Aura</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-[13px] font-medium mb-1.5 block">First name</label>
                <Input
                  type="text"
                  placeholder="Alex"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            )}
            <div>
              <label className="text-[13px] font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div>
              <label className="text-[13px] font-medium mb-1.5 block">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-11"
              />
            </div>
            {error && <p className="text-[13px] text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading
                ? mode === "register"
                  ? "Creating account..."
                  : "Signing in..."
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            className="w-full text-center text-[13px] text-muted-foreground hover:text-foreground transition-colors py-3 mt-2"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
