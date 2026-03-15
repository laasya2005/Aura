import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions - Aura",
  description: "Terms and Conditions for Aura - Your AI Companion",
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 14, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Aura (&quot;the Service&quot;), you agree to be bound by these
              Terms and Conditions (&quot;Terms&quot;). If you do not agree to these Terms, please
              do not use the Service. We reserve the right to modify these Terms at any time, and
              your continued use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Program Description</h2>
            <p>
              Aura is an AI-powered accountability companion that helps users achieve their goals
              through personalized check-in messages, motivational content, and progress tracking.
              The Service is delivered through our web application and, with your consent, via SMS
              text messages and automated voice calls.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <span className="font-medium">Program name:</span> Aura Goal Check-ins
              </li>
              <li>
                <span className="font-medium">Message frequency:</span> Varies based on your
                configured schedules. You control when and how often you receive messages.
              </li>
              <li>
                <span className="font-medium">Message and data rates may apply.</span> Contact your
                carrier for details about your messaging plan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Eligibility</h2>
            <p>
              You must be at least 13 years of age to use the Service. By using the Service, you
              represent and warrant that you meet this requirement and have the legal capacity to
              enter into these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Account Registration</h2>
            <p>
              To use the Service, you must create an account using a valid phone number. You are
              responsible for maintaining the confidentiality of your account and for all activities
              that occur under your account. You agree to provide accurate and complete information
              and to update it as necessary.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. SMS and Voice Communications</h2>
            <p>
              By opting in to SMS or voice communications through the Service, you consent to
              receive recurring automated text messages and/or voice calls from Aura at the phone
              number you provided. These messages will relate to your goals, schedules, streak
              updates, and motivational check-ins.
            </p>

            <h3 className="font-medium mt-4 mb-2">5.1 Opting In</h3>
            <p>
              You opt in to SMS/voice communications by enabling them during onboarding, creating
              schedules with SMS or voice channels, or enabling SMS/voice in your notification
              settings. You may also opt in by texting START or SUBSCRIBE to our messaging number.
            </p>

            <h3 className="font-medium mt-4 mb-2">5.2 Opting Out</h3>
            <p>You can opt out of SMS messages at any time by:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                Replying <span className="font-bold">STOP</span> to any SMS message from Aura.
              </li>
              <li>Disabling SMS notifications in your account Settings.</li>
              <li>Deleting your schedules that use SMS.</li>
              <li>Deleting your account.</li>
            </ul>
            <p className="mt-2">
              After opting out, you will receive a final confirmation message and will no longer
              receive SMS messages from Aura unless you opt back in.
            </p>

            <h3 className="font-medium mt-4 mb-2">5.3 Getting Help</h3>
            <p>For help with SMS messaging, you can:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                Reply <span className="font-bold">HELP</span> to any SMS message from Aura.
              </li>
              <li>Contact us at support@aura-app.com.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Subscription Plans and Billing</h2>
            <p>
              Aura offers free and paid subscription plans. Paid plans are billed on a recurring
              monthly basis through Stripe. By subscribing to a paid plan, you authorize us to
              charge your payment method on a recurring basis until you cancel.
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>
                <span className="font-medium">Free plan:</span> Limited features at no cost.
              </li>
              <li>
                <span className="font-medium">Pro plan ($9.99/mo):</span> Expanded goals, schedules,
                SMS + voice, and custom personality tuning.
              </li>
              <li>
                <span className="font-medium">Elite plan ($24.99/mo):</span> Full access to all
                features including natural language tuning and context imports.
              </li>
            </ul>
            <p className="mt-2">
              You may upgrade, downgrade, or cancel your subscription at any time through the
              Settings page or the Stripe billing portal. Cancellations take effect at the end of
              the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. AI-Generated Content</h2>
            <p>
              The Service uses artificial intelligence to generate personalized messages, coaching,
              and motivational content. AI-generated content is provided for informational and
              motivational purposes only and should not be considered professional advice (medical,
              financial, psychological, or otherwise). You acknowledge that AI responses may
              occasionally be inaccurate or inappropriate, and you use such content at your own
              discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Use the Service for any unlawful purpose.</li>
              <li>Attempt to gain unauthorized access to the Service or its systems.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
              <li>Use the Service to send spam or unsolicited messages.</li>
              <li>Impersonate any person or entity.</li>
              <li>Reverse engineer, decompile, or disassemble any aspect of the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Intellectual Property</h2>
            <p>
              The Service, including its design, features, content, and technology, is owned by Aura
              and is protected by intellectual property laws. You retain ownership of the content
              you create (goals, messages, etc.), but grant us a license to use that content as
              necessary to provide and improve the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your personal information. Your
              phone number and messaging consent information will not be shared with third parties
              for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Disclaimers</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, either express or implied. We do not warrant that the Service
              will be uninterrupted, error-free, or secure. Aura is not a substitute for
              professional medical, psychological, financial, or legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Aura and its affiliates shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages arising out
              of or related to your use of the Service, including but not limited to loss of data,
              loss of profits, or any damages resulting from AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Account Termination</h2>
            <p>
              You may delete your account at any time through the Settings page. We reserve the
              right to suspend or terminate your account if you violate these Terms or engage in
              conduct that we determine is harmful to the Service or other users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">14. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by
              posting the updated Terms on this page and updating the &quot;Last updated&quot; date.
              Your continued use of the Service after any changes constitutes acceptance of the
              updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">15. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">16. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
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
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span>&middot;</span>
          <span>&copy; {new Date().getFullYear()} Aura</span>
        </div>
      </footer>
    </main>
  );
}
