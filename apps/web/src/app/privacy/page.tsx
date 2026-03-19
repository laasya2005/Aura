import Link from "next/link";
import { AuraLogo } from "@/components/ui/aura-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Aura",
  description: "Privacy Policy for Aura - AI Companion",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-foreground flex items-center justify-center text-background">
              <AuraLogo />
            </div>
            <span className="text-xl font-bold">Aura</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 18, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p>
              Aura (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI coaching service via iMessage/SMS
              and our website (collectively, the &quot;Service&quot;).
            </p>
            <p className="mt-2">
              By accessing or using the Service, you agree to this Privacy Policy. If you do not
              agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="font-medium mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <span className="font-medium">Phone number:</span> Your phone number is collected
                automatically when you text Aura and is used to identify your account.
              </li>
              <li>
                <span className="font-medium">Conversation data:</span> Messages exchanged between
                you and Aura via iMessage/SMS, including your name, goals, preferences, and any
                information you choose to share during conversations.
              </li>
              <li>
                <span className="font-medium">Goal and schedule data:</span> Goals, reminders, and
                check-in preferences you set up through conversation.
              </li>
              <li>
                <span className="font-medium">Payment information:</span> If you subscribe to a
                paid plan, payment is processed securely through Stripe. We do not store your
                credit card details.
              </li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <span className="font-medium">Usage data:</span> Message timestamps, engagement
                patterns, and streak records.
              </li>
              <li>
                <span className="font-medium">Device information:</span> When using our website,
                browser type, operating system, and device identifiers may be collected.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Provide, maintain, and improve the Service.</li>
              <li>
                Send you personalized coaching messages, reminders, and motivational check-ins
                via iMessage/SMS.
              </li>
              <li>
                Generate AI-powered responses tailored to your goals, personality, and conversation
                history.
              </li>
              <li>Track your goal streaks and provide progress updates.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Respond to your inquiries and provide support.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. How We Share Your Information</h2>
            <p>
              We do not sell your personal information. We may share your information only in the
              following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <span className="font-medium">Service providers:</span> We use third-party
                providers to operate the Service, including Sendblue (iMessage/SMS delivery),
                Stripe (payment processing), and AI providers (message generation). These
                providers access your data only as necessary to perform their services and are
                bound by contractual obligations to protect your information.
              </li>
              <li>
                <span className="font-medium">Legal requirements:</span> We may disclose your
                information if required by law, regulation, legal process, or governmental request.
              </li>
              <li>
                <span className="font-medium">Business transfers:</span> In connection with a
                merger, acquisition, or sale of assets, your information may be transferred as part
                of that transaction.
              </li>
              <li>
                <span className="font-medium">With your consent:</span> We may share information
                when you give us explicit permission to do so.
              </li>
            </ul>
            <p className="mt-3">
              Your phone number and messaging consent information will not be shared with third
              parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide the Service. If you opt out by texting STOP, we will delete or anonymize
              your personal data within 30 days, except where we are required to retain it for
              legal or regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information,
              including encryption in transit (TLS) and at rest, secure authentication mechanisms,
              and regular security assessments. However, no method of transmission or storage is
              100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Your Rights and Choices</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <span className="font-medium">Opt out of messaging:</span> Text STOP to Aura at
                any time to stop receiving messages.
              </li>
              <li>
                <span className="font-medium">Request data deletion:</span> Contact us at
                support@aura-app.com to request deletion of your data.
              </li>
              <li>
                <span className="font-medium">Access your data:</span> Contact us to request a
                copy of the personal information we hold about you.
              </li>
              <li>
                <span className="font-medium">Get help:</span> Text HELP to Aura or email us at
                support@aura-app.com.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. SMS/iMessage Messaging</h2>
            <p>
              When you text Aura, you consent to receive recurring automated AI-generated messages
              related to your goals, accountability, and motivational coaching. Message frequency
              varies based on your conversations and configured reminders. Standard message and
              data rates may apply.
            </p>
            <p className="mt-2">
              You can opt out at any time by texting STOP. Text HELP for help. Your phone number
              and messaging consent information will not be shared with third parties for marketing
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under the age of 13. We do not knowingly
              collect personal information from children under 13. If we learn that we have
              collected information from a child under 13, we will take steps to delete that
              information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page and updating the &quot;Last
              updated&quot; date. Your continued use of the Service after any changes constitutes
              your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please
              contact us at:
            </p>
            <p className="mt-2 font-medium">support@aura-app.com</p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>&middot;</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span>&middot;</span>
          <span>&copy; {new Date().getFullYear()} Aura</span>
        </div>
      </footer>
    </main>
  );
}
