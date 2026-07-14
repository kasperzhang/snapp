"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Layers } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWorkbenches } from "@/hooks";
import { Sidebar, ContentPanel } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { WorkbenchCard } from "@/components/workbench";

export default function WorkbenchLibraryPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>();
  const { workbenches, loading, deleteWorkbench } = useWorkbenches();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email);
    });
  }, []);

  // New mix = the visual compose flow on the Bookmarks page
  const startCompose = () => router.push("/app?compose=1");

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--sidebar)]">
      <Sidebar userEmail={userEmail} />
      <ContentPanel>
        <main className="max-w-[1200px] mx-auto px-6 md:px-10 py-8 md:py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">
              Your mixes
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Your saved compositions.
            </p>
          </div>
          <Button size="sm" onClick={startCompose}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New mix</span>
          </Button>
        </div>

        {loading ? (
          <p className="text-[var(--text-secondary)]">Loading…</p>
        ) : workbenches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Layers className="w-8 h-8 text-[var(--text-secondary)] mb-4" />
            <p className="text-[var(--text-secondary)] mb-4">
              No mixes yet. Pick some sites to start mixing.
            </p>
            <Button onClick={startCompose}>
              <Plus className="w-4 h-4" />
              New mix
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workbenches.map((w) => (
              <WorkbenchCard
                key={w.id}
                workbench={w}
                onDelete={deleteWorkbench}
              />
            ))}
          </div>
        )}
        </main>
      </ContentPanel>
    </div>
  );
}
