import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — snapp",
};

const CONTACT_EMAIL = "kasperzhang.ai@gmail.com";

export default function RefundsPage() {
  return (
    <LegalShell title="Refund & Cancellation Policy" effective="July 16, 2026">
      <p>
        snapp Pro is a monthly subscription (currently US$12/month) billed
        through Stripe. Here&apos;s how cancellation and refunds work — we
        try to keep this fair and unsurprising.
      </p>

      <h2>Cancel anytime</h2>
      <p>
        Cancel from <strong>Settings → Manage billing</strong> (the Stripe
        customer portal). Your subscription stops renewing immediately, and
        you keep Pro access until the end of the period you&apos;ve already
        paid for. No cancellation fees.
      </p>

      <h2>First purchase — 14-day guarantee</h2>
      <p>
        If Pro isn&apos;t what you expected, email us within{" "}
        <strong>14 days of your first payment</strong> and we&apos;ll refund
        it in full — no questions, no hoops.
      </p>

      <h2>Renewals</h2>
      <p>
        Renewal payments are generally non-refundable, but if you forgot to
        cancel and haven&apos;t meaningfully used Pro since the renewal
        (briefs, analyses, or scans), email us within 7 days of the charge
        and we&apos;ll refund it.
      </p>

      <h2>Something broke</h2>
      <p>
        If a service problem on our side kept you from using what you paid
        for, tell us — we&apos;ll make it right with a refund or credit.
      </p>

      <h2>How refunds arrive</h2>
      <p>
        Refunds go back to the original payment method via Stripe, usually
        within 5–10 business days depending on your bank.
      </p>

      <h2>Contact</h2>
      <p>
        Requests and questions:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Include the
        email on your snapp account.
      </p>
    </LegalShell>
  );
}
