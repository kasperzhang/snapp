"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          // Only used when "Confirm email" is ON. Without it the link falls back
          // to the Site URL — the marketing homepage — where nothing exchanges
          // the token, so the button in the email appears to do nothing. No
          // query string: Supabase matches redirect URLs exactly, and a `?next=`
          // suffix silently drops it back to the Site URL (see commit 68eb7ab).
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Whether a confirmation email exists at all is a Supabase project
      // setting, not something this page can assume. With "Confirm email" off,
      // signUp returns a live session and no mail is ever sent — showing "check
      // your email" there is simply false, and the visitor is already signed in.
      if (data.session) {
        router.push("/app");
        router.refresh();
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`We sent a confirmation link to ${email}. Click it to activate your account.`}
      >
        <div className="mb-3 flex items-center gap-2.5 rounded-[10px] bg-[var(--brand-tint)] px-3.5 py-3 text-sm text-[var(--text-secondary)]">
          <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />
          Link sent — it expires in an hour.
        </div>
        {/* Even with SPF, DKIM and DMARC in order, a domain with no sending
            history gets filtered — Outlook flags first contact explicitly. This
            costs nothing to say and saves the signup that would otherwise be
            abandoned at an apparently-empty inbox. */}
        <p className="mb-6 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Not there in a minute or two? Check your spam or junk folder — new
          senders often land there the first time.
        </p>
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
      title="Create your account"
      subtitle="Start collecting the sites you wish you'd made."
      footer={
        <>
          <GoogleSignInButton onError={setError} />
          <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-3.5">
        <Input
          id="name"
          label="Name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
          className="h-11"
        />

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

        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          disabled={!email || !password}
        >
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
