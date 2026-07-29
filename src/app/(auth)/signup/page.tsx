"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignupPage() {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
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
