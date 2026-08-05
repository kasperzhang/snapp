"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/components/auth/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // No query string here, deliberately: Supabase matches redirectTo against
      // its allowlist exactly, and a `?next=` suffix makes it silently fall back
      // to the Site URL — the marketing homepage — so the reset looks like it
      // did nothing (this is what commit 68eb7ab fixed for Google OAuth).
      // /reset-password therefore exchanges the PKCE code itself.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // Deliberately not surfacing "no such user": whether an address has an
      // account is not something a signed-out visitor should be able to probe.
      if (error && error.status !== 400) {
        setError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`If ${email} has an account, a reset link is on its way.`}
      >
        <div className="mb-6 flex items-center gap-2.5 rounded-[10px] bg-[var(--brand-tint)] px-3.5 py-3 text-sm text-[var(--text-secondary)]">
          <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />
          Link sent — it expires in an hour.
        </div>
        <Link href="/login">
          <Button variant="secondary" className="h-11 w-full">
            Back to sign in
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <p className="text-center text-sm text-[var(--text-secondary)]">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="h-11"
          required
        />

        {error && (
          <p
            role="alert"
            className="rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-11 w-full"
          loading={loading}
          disabled={!email}
        >
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
