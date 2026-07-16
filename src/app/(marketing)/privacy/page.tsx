import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — snapp",
};

const CONTACT_EMAIL = "kasperzhang.ai@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" effective="July 16, 2026">
      <p>
        This policy explains what snapp collects, why, and what happens to
        it. The short version: we collect what&apos;s needed to run a
        bookmark app with billing, we don&apos;t sell your data, and we
        don&apos;t run advertising trackers.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — your email, name, and a password
          hash (or your Google account identity if you sign in with Google).
        </li>
        <li>
          <strong>Your content</strong> — the URLs you bookmark, titles,
          notes, tags, mixes, and the screenshots, fonts, and colors captured
          when you scan a site, plus the design briefs generated for you.
        </li>
        <li>
          <strong>Usage records</strong> — a log of metered actions (briefs,
          analyses, scans) with token counts and estimated cost, used to
          enforce plan limits and billing.
        </li>
        <li>
          <strong>Payment data</strong> — handled by Stripe. We store your
          Stripe customer and subscription identifiers and plan status; we
          never see or store card numbers.
        </li>
      </ul>
      <p>
        We don&apos;t use advertising cookies or cross-site trackers. The
        only cookies are the session cookies that keep you signed in.
      </p>

      <h2>2. How we use it</h2>
      <ul>
        <li>to provide the service — storing and showing your library;</li>
        <li>
          to generate design briefs: when you run a scan or a mix, the
          relevant screenshots, extracted fonts/colors, and your notes are
          sent to Anthropic&apos;s Claude API to produce the brief;
        </li>
        <li>to enforce plan limits and process subscription payments;</li>
        <li>to respond when you contact us.</li>
      </ul>

      <h2>3. Who processes it</h2>
      <p>Your data is handled by these processors on our behalf:</p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and file
          storage (screenshots);
        </li>
        <li>
          <strong>Stripe</strong> — subscription billing;
        </li>
        <li>
          <strong>Anthropic</strong> — AI generation (receives site
          screenshots, extracted design data, and your notes when you
          generate);
        </li>
        <li>
          <strong>Google</strong> — sign-in, if you choose Google OAuth;
        </li>
        <li>
          <strong>Vercel</strong> — application hosting.
        </li>
      </ul>
      <p>We don&apos;t sell your data or share it with advertisers.</p>

      <h2>4. Retention and deletion</h2>
      <p>
        Your content stays until you delete it or your account. Deleting a
        bookmark or mix removes it (and its stored screenshots) from our
        systems. To delete your whole account and its data, email us — we&apos;ll
        confirm and complete the deletion within 30 days. Billing records are
        kept as long as tax and accounting law requires.
      </p>

      <h2>5. Your rights</h2>
      <p>
        snapp is operated from Canada and handles personal data in line with
        PIPEDA. Depending on where you live (e.g. PIPEDA, GDPR, or CCPA),
        you may have rights to access, correct, export, or delete your
        personal data, and to object to certain processing. Email us and
        we&apos;ll honor those requests.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is encrypted in transit, stored with row-level access controls
        (your data is only readable by your account), and payment handling is
        delegated to Stripe. No system is perfectly secure — if a breach
        affects your data, we&apos;ll notify you as the law requires.
      </p>

      <h2>7. Children</h2>
      <p>
        snapp isn&apos;t directed at children under 13 and we don&apos;t
        knowingly collect their data.
      </p>

      <h2>8. Changes</h2>
      <p>
        If this policy changes materially, we&apos;ll notify you before the
        change takes effect. The effective date above always reflects the
        current version.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions and requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalShell>
  );
}
