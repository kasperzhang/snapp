"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/components/auth/AuthCard";

const MIN_PASSWORD = 6; // matches the signup form's stated minimum

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The recovery link lands here directly with a PKCE `code` (see the comment
  // in /forgot-password for why it can't go through /callback). Trade it for a
  // session before showing the form; without one there's nothing to update.
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        // Drop the code from the URL so a refresh doesn't retry a spent one.
        window.history.replaceState({}, "", "/reset-password");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (alive) setReady(Boolean(user));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/app");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (ready === false) {
    return (
      <AuthCard
        title="This link has expired"
        subtitle="Reset links are good for an hour. Request a fresh one and we'll send another."
      >
        <Link href="/forgot-password">
          <Button className="h-11 w-full">Send a new link</Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Pick something you'll remember. You'll stay signed in on this device."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Input
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD} characters`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || ready === null}
          className="h-11"
          minLength={MIN_PASSWORD}
          required
        />

        <Input
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={loading || ready === null}
          className="h-11"
          minLength={MIN_PASSWORD}
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
          disabled={
            ready === null || password.length < MIN_PASSWORD || !confirm
          }
        >
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}
