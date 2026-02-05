"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <Card className="w-full max-w-sm p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Check your email
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            We&apos;ve sent you a confirmation link. Click it to activate your
            account.
          </p>
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Back to Login
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-4">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Create an account
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Start organizing your bookmarks
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!email || !password}
          >
            Create Account
          </Button>
        </form>

        <p className="text-sm text-center text-[var(--text-secondary)] mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--accent)] hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
