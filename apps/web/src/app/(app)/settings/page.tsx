"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn, formatEnum } from "@/lib/utils";

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
    features: ["10 schedules", "Chat check-ins", "Basic streak tracking"],
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$9",
    period: "/mo",
    emoji: "⚡",
    features: [
      "25 schedules",
      "Unlimited chat",
      "Aura personality tuning",
      "Advanced analytics",
      "Priority responses",
    ],
  },
  {
    key: "ELITE",
    name: "Elite",
    price: "$19",
    period: "/mo",
    emoji: "👑",
    features: [
      "100 schedules",
      "Unlimited everything",
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
  const consentTypes = ["NOTIFICATIONS", "MARKETING", "DATA_PROCESSING"];

  const CONSENT_META: Record<string, { label: string; desc: string; emoji: string }> = {
    NOTIFICATIONS: { label: "Notifications", desc: "Check-in notifications", emoji: "🔔" },
    MARKETING: { label: "Marketing", desc: "Product updates", emoji: "📣" },
    DATA_PROCESSING: { label: "AI Data", desc: "AI personalization", emoji: "🤖" },
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
        <p className="text-base text-muted-foreground mt-1">
          Your account, notifications, and plan.
        </p>
      </div>

      {/* Profile + Notifications — equal columns, aligned tops */}
      <div className="grid gap-8 lg:grid-cols-2 items-stretch">
        {/* Profile */}
        <div className="flex flex-col">
          <p className="text-[14px] text-muted-foreground font-medium mb-4">Profile</p>
          <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl divide-y divide-border/50 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 gap-2 sm:gap-4">
              <label className="text-[15px] text-muted-foreground sm:w-24 sm:flex-shrink-0">Name</label>
              <div className="flex gap-3 flex-1">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 gap-2 sm:gap-4">
              <label className="text-[15px] text-muted-foreground sm:w-24 sm:flex-shrink-0">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 gap-2 sm:gap-4">
              <label className="text-[15px] text-muted-foreground sm:w-24 sm:flex-shrink-0">
                Timezone
              </label>
              <div className="flex-1">
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
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 gap-2 sm:gap-4">
              <label className="text-[15px] text-muted-foreground sm:w-24 sm:flex-shrink-0">Phone</label>
              <Input value={profile?.phone ?? ""} disabled className="opacity-50" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="flex flex-col">
          <p className="text-[14px] text-muted-foreground font-medium mb-4">Notifications</p>
          <div className="rounded-[16px] border border-border/50 bg-card/80 backdrop-blur-xl divide-y divide-border/50 overflow-hidden flex-1 flex flex-col">
            {consentTypes.map((type) => {
              const consent = consents.find((c) => c.type === type);
              const granted = consent?.granted ?? false;
              const meta = CONSENT_META[type];
              return (
                <div
                  key={type}
                  className="flex items-center justify-between gap-3 px-6 py-5 flex-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[18px]">{meta?.emoji}</span>
                    <div>
                      <p className="text-[15px] font-medium">{meta?.label ?? formatEnum(type)}</p>
                      <p className="text-[13px] text-muted-foreground">{meta?.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleConsent(type, granted)}
                    className={cn(
                      "relative h-[30px] w-[50px] flex-shrink-0 rounded-full transition-all duration-200",
                      granted ? "bg-emerald-500" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-[3px] left-[3px] h-[24px] w-[24px] rounded-full bg-white shadow-sm transition-transform duration-200",
                        granted ? "translate-x-[20px]" : ""
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plan */}
      <div>
        <p className="text-[14px] text-muted-foreground font-medium mb-1">Plan</p>
        <p className="text-[15px] text-muted-foreground mb-4">
          You&apos;re on the{" "}
          <span className="font-medium text-foreground">{formatEnum(currentPlan)}</span> plan.
        </p>
        {billingSuccess && (
          <p className="text-[15px] text-foreground bg-accent rounded-[12px] px-4 py-3 border border-border mb-4">
            {billingSuccess}
          </p>
        )}
        {billingError && (
          <p className="text-[15px] text-destructive bg-destructive/10 rounded-[12px] px-4 py-3 border border-destructive/20 mb-4">
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
                  "flex flex-col rounded-[16px] border p-6 transition-all duration-200",
                  isCurrent
                    ? "border-foreground/20 bg-accent"
                    : "border-border/50 hover:border-foreground/15"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[18px] font-bold">{plan.name}</p>
                  {isCurrent && (
                    <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[12px] text-background font-medium">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[24px] sm:text-[32px] font-bold tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className="text-[14px] text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-[14px] text-muted-foreground"
                    >
                      <span className="text-foreground/40">&#10003;</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {isCurrent ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full pointer-events-none opacity-50"
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
      </div>

      {/* Danger zone */}
      <div>
        <p className="text-[14px] text-muted-foreground font-medium mb-4">Danger zone</p>
        <div className="rounded-[16px] border border-destructive/20 bg-card/80 backdrop-blur-xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[16px] font-medium">Delete account</p>
            <p className="text-[14px] text-muted-foreground mt-0.5">
              Permanently remove your account and all data.
            </p>
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
      </div>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete account"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account, schedules, and conversation history. This
            action cannot be undone.
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
