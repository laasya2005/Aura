"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { AuraLogo } from "@/components/ui/aura-logo";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await apiFetch("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });

    setLoading(false);

    if (res.success) {
      setStep("otp");
    } else {
      setError(res.error?.message ?? "Failed to send code");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await apiFetch<{
      accessToken: string;
      user: { id: string; plan: string; isNew: boolean; status: string; firstName?: string };
    }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    });

    setLoading(false);

    if (res.success && res.data) {
      await login(res.data.accessToken, "", res.data.user);

      if (res.data.user.status === "ONBOARDING") {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(res.error?.message ?? "Invalid code");
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
            {step === "phone"
              ? "Enter your phone number to sign in"
              : "Enter the verification code"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-xl">
          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-[13px] font-medium mb-1.5 block">Phone number</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              {error && <p className="text-[13px] text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Sending..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-[13px] text-muted-foreground text-center mb-1">
                Code sent to <span className="font-medium text-foreground">{phone}</span>
              </p>
              <div>
                <label className="text-[13px] font-medium mb-1.5 block">Verification code</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center tracking-[0.3em] font-mono h-11 text-lg"
                  required
                />
              </div>
              {error && <p className="text-[13px] text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Verifying..." : "Sign in"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-[13px] text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
