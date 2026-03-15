"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, formatEnum } from "@/lib/utils";
import { Settings as SettingsIcon, Bell, CreditCard, Shield } from "lucide-react";

interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  timezone: string;
  plan: string;
  status: string;
}

interface Consent {
  id: string;
  type: string;
  granted: boolean;
  grantedAt: string;
}

const PLAN_ORDER = ["FREE", "PRO", "ELITE"];

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "",
    emoji: "🆓",
    features: ["10 active goals", "10 schedules", "WhatsApp check-ins", "Basic streak tracking"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$9",
    period: "/mo",
    emoji: "⚡",
    features: [
      "25 active goals",
      "25 schedules",
      "WhatsApp + Voice check-ins",
      "Aura personality tuning",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    key: "ELITE",
    name: "Elite",
    price: "$19",
    period: "/mo",
    emoji: "👑",
    features: [
      "100 active goals",
      "100 schedules",
      "All channels",
      "Custom Aura personality",
      "Group accountability",
      "Dedicated support",
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("");
  const [consents, setConsents] = useState<Consent[]>([]);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingSuccess, setBillingSuccess] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const load = useCallback(async () => {
    const [profileRes, consentRes] = await Promise.all([
      apiFetch<UserProfile>("/users/me"),
      apiFetch<Consent[]>("/users/me/consent"),
    ]);
    if (profileRes.success && profileRes.data) {
      setProfile(profileRes.data);
      setFirstName(profileRes.data.firstName ?? "");
      setLastName(profileRes.data.lastName ?? "");
      setEmail(profileRes.data.email ?? "");
      setTimezone(profileRes.data.timezone);
    }
    if (consentRes.success && consentRes.data) {
      setConsents(consentRes.data);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // After returning from Stripe checkout, confirm the session and apply the plan
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const billing = searchParams.get("billing");
    if (sessionId && billing === "success") {
      (async () => {
        setBillingLoading(true);
        const res = await apiFetch<{ plan: string }>("/billing/confirm", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        });
        setBillingLoading(false);
        if (res.success && res.data) {
          setBillingSuccess(`Upgraded to ${formatEnum(res.data.plan)}!`);
          await refreshUser();
          await load();
        } else {
          setBillingError(res.error?.message ?? "Failed to confirm upgrade.");
        }
        // Clean up URL params
        router.replace("/settings");
      })();
    }
  }, [searchParams, refreshUser, load, router]);

  const saveProfile = async () => {
    setSaving(true);
    await apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        timezone: timezone || undefined,
      }),
    });
    await refreshUser();
    setSaving(false);
  };

  const toggleConsent = async (type: string, currentlyGranted: boolean) => {
    await apiFetch("/users/me/consent", {
      method: "POST",
      body: JSON.stringify({ type, granted: !currentlyGranted }),
    });
    load();
  };

  const openCheckout = async (plan: "PRO" | "ELITE") => {
    setBillingLoading(true);
    setBillingError("");
    const res = await apiFetch<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    setBillingLoading(false);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setBillingError(res.error?.message ?? "Unable to start checkout.");
    }
  };

  const openPortal = async () => {
    setBillingLoading(true);
    setBillingError("");
    const res = await apiFetch<{ url: string }>("/billing/portal", {
      method: "POST",
      body: JSON.stringify({}),
    });
    setBillingLoading(false);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      setBillingError(res.error?.message ?? "Unable to open billing portal.");
    }
  };

  const deleteAccount = async () => {
    await apiFetch("/users/me", { method: "DELETE" });
    document.cookie = "aura_logged_in=; path=/; max-age=0";
    await logout();
    router.push("/");
  };

  const currentPlan = profile?.plan ?? user?.plan ?? "FREE";
  const consentTypes = ["WHATSAPP", "VOICE", "MARKETING", "DATA_PROCESSING"];

  const CONSENT_META: Record<string, { label: string; desc: string; emoji: string }> = {
    WHATSAPP: { label: "WhatsApp", desc: "WhatsApp messages", emoji: "💬" },
    VOICE: { label: "Voice", desc: "Voice calls", emoji: "📞" },
    MARKETING: { label: "Marketing", desc: "Product updates", emoji: "📣" },
    DATA_PROCESSING: { label: "AI Data", desc: "AI personalization", emoji: "🤖" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Settings <span className="text-xl">⚙️</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile + Notifications */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
                <SettingsIcon className="h-3.5 w-3.5 text-foreground" />
              </div>
              <CardTitle>Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">First name</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Last name</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Timezone</label>
              <Select
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: "America/New_York", label: "Eastern (ET)" },
                  { value: "America/Chicago", label: "Central (CT)" },
                  { value: "America/Denver", label: "Mountain (MT)" },
                  { value: "America/Los_Angeles", label: "Pacific (PT)" },
                  { value: "America/Phoenix", label: "Arizona" },
                  { value: "America/Anchorage", label: "Alaska (AKT)" },
                  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
                ]}
                placeholder="Select timezone"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
              <Input value={profile?.phone ?? ""} disabled className="opacity-50" />
            </div>
            <div className="pt-1">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
                <Bell className="h-3.5 w-3.5 text-foreground" />
              </div>
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Control how Aura reaches you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {consentTypes.map((type) => {
              const consent = consents.find((c) => c.type === type);
              const granted = consent?.granted ?? false;
              const meta = CONSENT_META[type];
              return (
                <div key={type} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{meta?.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{meta?.label ?? formatEnum(type)}</p>
                      <p className="text-xs text-muted-foreground">{meta?.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConsent(type, granted)}
                    className={cn(
                      "relative h-6 w-11 flex-shrink-0 rounded-full transition-all duration-200",
                      granted ? "bg-foreground" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background transition-transform duration-200 shadow-sm",
                        granted ? "translate-x-5" : ""
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5 text-foreground" />
            </div>
            <CardTitle>Plan</CardTitle>
          </div>
          <CardDescription>
            You&apos;re on the{" "}
            <span className="font-medium text-foreground">{formatEnum(currentPlan)}</span> plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {billingSuccess && (
            <p className="text-sm text-foreground bg-accent rounded-xl px-4 py-2 border border-border">
              {billingSuccess}
            </p>
          )}
          {billingError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2 border border-destructive/20">
              {billingError}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const isUpgrade = PLAN_ORDER.indexOf(plan.key) > PLAN_ORDER.indexOf(currentPlan);
              const isDowngrade = PLAN_ORDER.indexOf(plan.key) < PLAN_ORDER.indexOf(currentPlan);
              return (
                <div
                  key={plan.key}
                  className={cn(
                    "flex flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5",
                    isCurrent
                      ? "border-foreground/20 bg-accent shadow-md"
                      : "border-border/50 hover:border-foreground/15 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{plan.emoji}</span>
                    <p className="text-sm font-bold">{plan.name}</p>
                    {isCurrent && (
                      <span className="ml-auto rounded-full bg-foreground px-2 py-0.5 text-2xs text-background font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-extrabold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-xs text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-foreground text-[10px] mt-0.5 flex-shrink-0">
                          &#10003;
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {isCurrent ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full pointer-events-none opacity-60"
                      >
                        Current plan
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => openCheckout(plan.key as "PRO" | "ELITE")}
                        disabled={billingLoading}
                      >
                        {billingLoading ? "..." : "Upgrade"}
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={openPortal}
                        disabled={billingLoading}
                      >
                        Downgrade
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <div className="flex items-center justify-between rounded-2xl border border-destructive/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-xs text-muted-foreground">
              Permanently remove your account and all data.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 flex-shrink-0"
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete
        </Button>
      </div>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete account"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account, goals, schedules, and conversation history.
            This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteAccount}
            >
              Delete account
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
