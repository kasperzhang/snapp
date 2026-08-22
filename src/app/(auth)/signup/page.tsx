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
  /* Supabase will not tell a stranger whether an address is registered, so a
     signup for an existing account returns success, no session, and no email.
     Read as "mail sent", that produces a Check your email screen for a message
     that was never sent — someone waits, checks spam, and gives up on an
     account they already have. */
  const [existing, setExisting] = useState(false);
  const [resent, setResent] = useState<"idle" | "sending" | "sent" | "done">(
    "idle"
  );
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

      /* The tell: a real signup comes back with one identity, a duplicate comes
         back with an empty array. It is the only difference between the two
         responses. */
      if (data.user && data.user.identities?.length === 0) {
        setExisting(true);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  /* The likely reason someone lands here: they signed up once, never clicked
     the link, and it expired an hour later. The signup form can't help them —
     it no-ops for an address that exists — so this is the only way back in
     short of a password reset. */
  const resendConfirmation = async () => {
    setResent("sending");
    const { error } = await supabase.auth.resend({ type: "signup", email });
    // Already confirmed is not a failure — it means they can just sign in.
    setResent(error ? "done" : "sent");
  };

  if (existing) {
    return (
      <AuthCard
        title="You already have an account"
        subtitle={`${email} is already registered. Sign in, or reset your password if you've forgotten it.`}
        /* The tray, not a hand-rolled rule inside the body: it's where every
           other auth screen puts the secondary path, and it comes with the
           tint and hairline that made this read as loose text on white. */
        footer={
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {resent === "sent" ? (
              "New link sent — check your inbox, and your spam folder."
            ) : resent === "done" ? (
              "That address is already confirmed, so signing in is all you need."
            ) : (
              <>
                Never confirmed your email?{" "}
                <button
                  onClick={resendConfirmation}
                  disabled={resent === "sending"}
                  className="font-medium text-[var(--accent)] underline underline-offset-2 hover:text-[var(--accent-hover)] disabled:opacity-60"
                >
                  {resent === "sending" ? "Sending…" : "Send a new link"}
                </button>{" "}
                — the first one expires after an hour.
              </>
            )}
          </p>
        }
      >
        <div className="space-y-3">
          <Link href="/login">
            <Button className="h-11 w-full">Sign in</Button>
          </Link>
          <Link href="/forgot-password">
            <Button variant="secondary" className="h-11 w-full">
              Reset password
            </Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

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
