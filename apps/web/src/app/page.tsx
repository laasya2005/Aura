"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AuraLogo } from "@/components/ui/aura-logo";

/** Replace with your actual iMessage-enabled phone number */
const AURA_PHONE = "+13054098546";
const IMESSAGE_URL = `sms:${AURA_PHONE}&body=Hey%20Aura`;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white overflow-hidden relative flex flex-col">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03] blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-[#0A0A0C]">
            <AuraLogo />
          </div>
          <span className="text-lg font-bold tracking-tight">Aura</span>
        </div>

        {/* Social proof pill */}
        <div className="hidden sm:flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2">
          <div className="flex -space-x-2">
            {["A", "J", "M"].map((letter, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-full bg-white/10 border-2 border-[#0A0A0C] flex items-center justify-center text-[10px] font-bold text-white/60"
              >
                {letter}
              </div>
            ))}
          </div>
          <span className="text-[13px] text-white/60">
            Trusted by <span className="text-white font-medium">2,000+</span> people leveling up
          </span>
        </div>

        <Link
          href="/login"
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white hover:bg-white/10 transition-all"
        >
          Login
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center -mt-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl"
        >
          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight"
          >
            Aura wants you to
            <br />
            <em className="not-italic font-extrabold bg-gradient-to-r from-white via-white/70 to-white bg-clip-text text-transparent">
              level up.
            </em>{" "}
            Do you?
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 text-lg sm:text-xl text-white/40 font-medium"
          >
            It all starts with one text.
          </motion.p>

          {/* CTA Button */}
          <motion.div variants={fadeUp} className="mt-10">
            <a
              href={IMESSAGE_URL}
              className="group inline-flex items-center gap-3 rounded-full border-2 border-white/20 bg-white px-6 sm:px-10 py-4 text-[#0A0A0C] text-lg font-semibold shadow-[0_0_40px_rgba(255,255,255,0.08)] hover:shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-all duration-300 hover:scale-[1.02]"
            >
              {/* iMessage icon */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[#34C759]"
              >
                <rect width="24" height="24" rx="6" fill="currentColor" />
                <path
                  d="M12 6C8.13 6 5 8.58 5 11.8C5 13.63 6.07 15.26 7.74 16.3L7.2 18.5L9.6 17.2C10.35 17.42 11.16 17.55 12 17.55C15.87 17.55 19 14.97 19 11.77C19 8.58 15.87 6 12 6Z"
                  fill="white"
                />
              </svg>
              Get Started
            </a>
          </motion.div>

          {/* Legal */}
          <motion.p
            variants={fadeUp}
            className="mt-5 text-[13px] text-white/25"
          >
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-white/40 transition-colors">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-white/40 transition-colors">
              Privacy
            </Link>
            .
          </motion.p>
        </motion.div>
      </main>

      {/* Bottom orb / decorative element */}
      <div className="relative z-0 flex items-end justify-center pb-0 pointer-events-none select-none overflow-hidden">
        <div className="relative w-[320px] h-[160px] sm:w-[500px] sm:h-[250px]">
          {/* Glow behind orb */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-white/[0.04] blur-[80px]" />
          {/* Orb */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full overflow-hidden translate-y-[55%]">
            <div className="w-full h-full rounded-full bg-gradient-to-b from-white/20 via-white/5 to-transparent border border-white/10" />
            {/* Inner rings */}
            <div className="absolute inset-[15%] rounded-full border border-white/[0.06]" />
            <div className="absolute inset-[30%] rounded-full border border-white/[0.04]" />
            <div className="absolute inset-[45%] rounded-full bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}
