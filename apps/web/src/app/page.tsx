"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Phone,
  Target,
  Zap,
  Shield,
  ArrowRight,
  Star,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuraLogo } from "@/components/ui/aura-logo";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const modes = [
  { name: "Glow", emoji: "✨", desc: "Warm & supportive best friend" },
  { name: "Flame", emoji: "🔥", desc: "Bold drill sergeant with heart" },
  { name: "Mirror", emoji: "🪞", desc: "Thoughtful therapist-coach" },
  { name: "Tide", emoji: "🌊", desc: "Calm zen meditation guide" },
  { name: "Volt", emoji: "⚡", desc: "Energetic ultimate hype person" },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["Web chat", "10 schedules", "Preset Aura modes"],
  },
  {
    name: "Pro",
    price: "$9",
    period: "/mo",
    features: ["WhatsApp + Web chat", "25 schedules", "Custom blend", "5 voice calls/mo"],
    popular: true,
  },
  {
    name: "Elite",
    price: "$19",
    period: "/mo",
    features: [
      "All channels",
      "100 schedules",
      "Natural language tuning",
      "20 voice calls/mo",
      "Context imports",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated mesh background */}
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-foreground flex items-center justify-center text-background">
              <AuraLogo />
            </div>
            <span className="text-xl font-bold">Aura</span>
          </Link>
          <Link href="/login">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-16 text-center">
        {/* Decorative floating shapes */}
        <div className="absolute top-1/4 left-[10%] w-20 h-20 rounded-full bg-foreground/5 blur-xl float" />
        <div className="absolute bottom-1/3 right-[15%] w-16 h-16 rounded-full bg-foreground/5 blur-xl float-delayed" />
        <div
          className="absolute top-1/3 right-[20%] w-12 h-12 rounded-2xl bg-foreground/3 blur-lg float"
          style={{ animationDelay: "-2s" }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm"
          >
            <Star className="h-3.5 w-3.5" />
            <span>Your accountability bestie</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl"
          >
            AI companion
            <br />
            <span className="gradient-text">that actually shows up</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-6 text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto"
          >
            Aura sends personalized texts, voice calls, and messages to keep you accountable with
            the personality <em>you</em> choose.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex gap-4 justify-center flex-wrap">
            <Link href="/login">
              <Button size="lg" className="text-lg gap-2 px-8">
                <span>Start Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="text-lg">
                How it works
              </Button>
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={fadeUp}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {["A", "J", "M", "S"].map((letter, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full bg-accent border-2 border-background flex items-center justify-center text-xs font-bold text-muted-foreground"
                >
                  {letter}
                </div>
              ))}
            </div>
            <span>
              Loved by <span className="text-foreground font-medium">2,000+</span> users
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center"
          >
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Three steps to level up</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-16 grid gap-6 md:grid-cols-3"
          >
            {[
              {
                icon: Calendar,
                title: "Set your schedule",
                desc: "Tell Aura when and how to check in with you.",
                step: "01",
              },
              {
                icon: AuraLogo,
                title: "Choose your Aura",
                desc: "Pick a personality mode or create a custom blend.",
                step: "02",
              },
              {
                icon: MessageCircle,
                title: "Get personalized nudges",
                desc: "Receive texts, calls, and messages on your schedule.",
                step: "03",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={scaleIn} className="group">
                <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 text-center transition-all duration-300 hover:border-foreground/15 hover:shadow-xl hover:-translate-y-1">
                  <span className="absolute top-4 right-4 text-4xl font-black text-foreground/5">
                    {item.step}
                  </span>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-md transition-transform group-hover:scale-110">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Aura Modes */}
      <section className="relative py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center"
          >
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Personalities
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">5 vibes, your choice</h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Each mode has its own personality. Mix and match or create your own custom blend.
            </p>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            {modes.map((mode) => (
              <motion.div key={mode.name} variants={scaleIn}>
                <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-foreground/15 cursor-default">
                  <span className="text-3xl block transition-transform group-hover:scale-110">
                    {mode.emoji}
                  </span>
                  <h3 className="mt-3 text-sm font-bold">{mode.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{mode.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center"
          >
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Use cases
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Built for your routine</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                icon: Zap,
                title: "Fitness",
                desc: "Daily workout reminders, streak tracking, motivation.",
                emoji: "💪",
              },
              {
                icon: Shield,
                title: "Mindfulness",
                desc: "Meditation prompts, gratitude check-ins, calm evenings.",
                emoji: "🧘",
              },
              {
                icon: Target,
                title: "Productivity",
                desc: "Morning plans, deep work nudges, progress reviews.",
                emoji: "🎯",
              },
              {
                icon: Phone,
                title: "Health",
                desc: "Hydration reminders, sleep routines, habit building.",
                emoji: "🌿",
              },
              {
                icon: Star,
                title: "Learning",
                desc: "Study schedules, quiz reminders, knowledge checks.",
                emoji: "📚",
              },
              {
                icon: MessageCircle,
                title: "Social",
                desc: "Connection reminders, gratitude texts, check-ins.",
                emoji: "💬",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={scaleIn}>
                <div className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 transition-all duration-300 hover:border-foreground/15 hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center"
          >
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Pricing
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Simple & transparent</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-12 grid gap-6 md:grid-cols-3"
          >
            {plans.map((plan) => (
              <motion.div key={plan.name} variants={scaleIn} className="flex">
                <div
                  className={`flex flex-col w-full rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                    plan.popular
                      ? "border-foreground/20 bg-accent/50 shadow-xl relative"
                      : "border-border/50 bg-card/80 backdrop-blur-sm hover:border-foreground/15 hover:shadow-lg"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-1 text-xs font-medium text-background">
                      Most popular
                    </div>
                  )}
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2.5 text-sm text-muted-foreground"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-foreground text-xs">
                          &#10003;
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className="block mt-6">
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                      Get started
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 px-4 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-2xl"
        >
          <div className="rounded-3xl border border-border/30 bg-accent/30 backdrop-blur-sm p-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to meet your Aura?</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Start for free. No credit card required.
            </p>
            <Link href="/login" className="mt-8 inline-block">
              <Button size="lg" className="text-lg gap-2 px-8">
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/30 py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-foreground flex items-center justify-center text-background">
              <AuraLogo className="h-2.5 w-2.5" />
            </div>
            <span>&copy; {new Date().getFullYear()} Aura</span>
          </div>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span>&middot;</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}
