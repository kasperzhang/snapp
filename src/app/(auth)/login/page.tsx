"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-4">
            <Bookmark className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            Welcome back
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in to your Snapp account
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Enter your password"
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
            Sign In
          </Button>
        </form>

        <p className="text-sm text-center text-[var(--text-secondary)] mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-[var(--accent)] hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
