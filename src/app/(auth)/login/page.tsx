"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Surface a failed OAuth round-trip (/callback redirects here with ?error).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setError("Sign-in didn't complete. Please try again.");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to pick up where your mixes left off."
      footer={
        <>
          <GoogleSignInButton onError={setError} />
          <p className="mt-4 text-center text-sm text-[var(--text-secondary)]">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-3.5">
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

        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11"
            required
          />
          <p className="mt-1.5 text-right">
            <Link
              href="/forgot-password"
              className="text-[13px] text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            >
              Forgot password?
            </Link>
          </p>
        </div>

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
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
