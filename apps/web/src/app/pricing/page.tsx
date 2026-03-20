"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AuraLogo } from "@/components/ui/aura-logo";
import { Check } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const PRO_LINK = process.env.NEXT_PUBLIC_STRIPE_LINK_PRO || "https://buy.stripe.com/test_14A6oGdCE26i6dR4RL6Zy00";
const ELITE_LINK = process.env.NEXT_PUBLIC_STRIPE_LINK_ELITE || "https://buy.stripe.com/test_dRdR8buw8uGgSvckd6Zy01";

const PLANS = [
  {
    key: "FREE",
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with Aura",
    features: [
      "iMessage conversations with Aura",
      "3 scheduled reminders",
      "5 active goals",
      "Streak tracking",
      "All personality modes",
    ],
    cta: null,
    highlight: false,
  },
  {
    key: "PRO",
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    description: "For people serious about their goals",
    features: [
      "Everything in Free",
      "25 scheduled reminders",
      "25 active goals",
      "Natural language personality tuning",
      "Weekly progress reports",
    ],
    cta: PRO_LINK,
    highlight: true,
  },
  {
    key: "ELITE",
    name: "Elite",
    price: "$19.99",
    period: "/mo",
    description: "The ultimate accountability experience",
    features: [
      "Everything in Pro",
      "100 scheduled reminders",
      "100 active goals",
      "Group accountability",
      "Weekly + monthly deep-dive reports",
    ],
    cta: ELITE_LINK,
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";

  // Append client_reference_id so Stripe passes the user ID back in the webhook
  function buildLink(baseUrl: string | null): string | null {
    if (!baseUrl || !uid) return baseUrl;
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}client_reference_id=${uid}`;
  }

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0C] text-white relative">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-[#0A0A0C]">
            <AuraLogo />
          </div>
          <span className="text-lg font-bold tracking-tight">Aura</span>
        </Link>
      </nav>

      {/* Header */}
      <div className="relative z-10 text-center px-5 pt-6 sm:pt-8 pb-8 sm:pb-12">
        <motion.h1
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-3xl sm:text-5xl font-extrabold tracking-tight"
        >
          Choose your plan
        </motion.h1>
        <motion.p
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-3 text-[15px] sm:text-lg text-white/40 max-w-md mx-auto"
        >
          Start free. Upgrade when you're ready to go all in.
        </motion.p>
      </div>

      {/* Plan cards */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-5 pb-16 sm:pb-20 grid gap-4 sm:gap-5 sm:grid-cols-3">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.key}
            custom={i + 2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 transition-all ${
              plan.highlight
                ? "border-white/20 bg-white/[0.06]"
                : "border-white/[0.08] bg-white/[0.03]"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[12px] font-semibold text-[#0A0A0C]">
                Most popular
              </div>
            )}

            <div className="mb-5">
              <p className="text-[18px] font-bold">{plan.name}</p>
              <p className="text-[13px] text-white/40 mt-1">{plan.description}</p>
            </div>

            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-[28px] sm:text-[36px] font-bold tracking-tight">{plan.price}</span>
              {plan.period && (
                <span className="text-[15px] text-white/40">{plan.period}</span>
              )}
            </div>

            <ul className="space-y-3 flex-1 mb-7">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[14px] text-white/70">
                  <Check className="h-4 w-4 text-white/30 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.cta ? (
              <a
                href={buildLink(plan.cta) ?? plan.cta}
                className={`block text-center rounded-xl py-3 text-[15px] font-semibold transition-all duration-200 ${
                  plan.highlight
                    ? "bg-white text-[#0A0A0C] hover:bg-white/90"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                Get {plan.name}
              </a>
            ) : (
              <div className="block text-center rounded-xl py-3 text-[15px] font-semibold bg-white/5 text-white/30">
                Current plan
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-10 px-6">
        <p className="text-[13px] text-white/20">
          Questions? Text Aura anytime.{" "}
          <Link href="/terms" className="underline hover:text-white/35 transition-colors">
            Terms
          </Link>{" "}
          &{" "}
          <Link href="/privacy" className="underline hover:text-white/35 transition-colors">
            Privacy
          </Link>
        </p>
      </div>
    </div>
  );
}
