import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Aura",
  description: "Privacy Policy for Aura - Your AI Companion",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-foreground flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <span className="text-xl font-bold">Aura</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 pt-28 pb-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 14, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p>
              Aura (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our web application and related SMS/voice
              services (collectively, the &quot;Service&quot;).
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
                <span className="font-medium">Account information:</span> Phone number, first name,
                last name, email address, and timezone.
              </li>
              <li>
                <span className="font-medium">Goal data:</span> Goal titles, categories,
                descriptions, and streak records you create within the Service.
              </li>
              <li>
                <span className="font-medium">Schedule preferences:</span> Check-in times, days, and
                communication channel preferences (SMS, voice, web).
              </li>
              <li>
                <span className="font-medium">Aura personality settings:</span> Your selected
                communication style and personality slider values.
              </li>
              <li>
                <span className="font-medium">Conversation data:</span> Messages exchanged between
                you and Aura through the chat interface.
              </li>
              <li>
                <span className="font-medium">Consent records:</span> Your opt-in/opt-out
                preferences for SMS, voice calls, and marketing communications.
              </li>
            </ul>

            <h3 className="font-medium mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <span className="font-medium">Usage data:</span> Pages visited, features used, and
                interaction timestamps.
              </li>
              <li>
                <span className="font-medium">Device information:</span> Browser type, operating
                system, and device identifiers.
              </li>
              <li>
                <span className="font-medium">Log data:</span> IP address, access times, and
                referring URLs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Provide, maintain, and improve the Service.</li>
              <li>
                Send you personalized check-in messages, reminders, and motivational content via SMS
                and voice calls based on your configured schedules.
              </li>
              <li>
                Generate AI-powered responses and coaching messages tailored to your goals and
                personality preferences.
              </li>
              <li>Track your goal streaks and provide progress updates.</li>
              <li>Process payments and manage your subscription.</li>
              <li>Respond to your inquiries and provide customer support.</li>
              <li>
                Send administrative notifications about your account, security, or changes to our
                policies.
              </li>
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
                <span className="font-medium">Service providers:</span> We use third-party providers
                to operate the Service, including Twilio (SMS and voice delivery), Stripe (payment
                processing), and AI providers (message generation). These providers access your data
                only as necessary to perform their services and are bound by contractual obligations
                to protect your information.
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
              We do not share your personal information with third parties for their own marketing
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide the Service. If you delete your account, we will delete or anonymize your
              personal data within 30 days, except where we are required to retain it for legal or
              regulatory purposes.
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
                <span className="font-medium">Access and update:</span> You can access and update
                your personal information through the Settings page in the app.
              </li>
              <li>
                <span className="font-medium">Delete your account:</span> You can delete your
                account and all associated data from the Settings page.
              </li>
              <li>
                <span className="font-medium">Opt out of SMS:</span> Reply STOP to any SMS message
                or disable SMS in your notification settings.
              </li>
              <li>
                <span className="font-medium">Opt out of voice calls:</span> Disable voice calls in
                your notification settings or delete your schedules.
              </li>
              <li>
                <span className="font-medium">Opt out of marketing:</span> Disable marketing
                communications in your notification settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. SMS/Voice Messaging</h2>
            <p>
              When you opt in to SMS or voice communications, you consent to receive recurring
              automated messages from Aura related to your goals and schedules. Message frequency
              varies based on your configured schedules. Message and data rates may apply. You can
              opt out at any time by replying STOP to any message, disabling SMS/voice in your
              notification settings, or contacting us at the address below.
            </p>
            <p className="mt-2">
              Your phone number and messaging consent information will not be shared with third
              parties for marketing purposes.
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
