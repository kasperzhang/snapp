import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withResolvedGuideStatus } from "@/lib/workbench/stale";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DESIGN_ASPECTS } from "@/types";

const DEFAULT_SELECTION = { aspects: [], fonts: [], colors: [], comment: "" };
const VALID_ASPECTS = new Set(DESIGN_ASPECTS.map((a) => a.id as string));

// Ensure a site_analyses row exists for a bookmark (fetch-or-create), return its id.
async function ensureAnalysis(
  supabase: SupabaseClient,
  bookmarkId: string,
  userId: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("site_analyses")
    .select("id")
    .eq("bookmark_id", bookmarkId)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("site_analyses")
    .insert({
      bookmark_id: bookmarkId,
      user_id: userId,
      analysis_status: "pending",
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");

    // Detail: one workbench with its items + each item's bookmark + analysis
    if (id) {
      const { data: workbench, error } = await supabase
        .from("workbenches")
        .select(
          "*, items:workbench_items(*, bookmark:bookmarks(*), analysis:site_analyses(*))"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !workbench) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Sort items by position for stable ordering
      if (Array.isArray(workbench.items)) {
        workbench.items.sort(
          (a: { position: number }, b: { position: number }) =>
            a.position - b.position
        );
      }

      // A run abandoned mid-flight would otherwise report `generating`
      // forever, locking the mix out of regeneration.
      return NextResponse.json(withResolvedGuideStatus(workbench));
    }

    // List: all workbenches with an item count
    const { data: workbenches, error } = await supabase
      .from("workbenches")
      .select("*, workbench_items(count)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching workbenches:", error);
      return NextResponse.json(
        { error: "Failed to fetch workbenches" },
        { status: 500 }
      );
    }

    const withCounts = (workbenches || []).map(
      (w: {
        workbench_items?: { count: number }[];
        guide_status?: string | null;
        updated_at?: string | null;
      }) =>
        withResolvedGuideStatus({
          ...w,
          item_count: w.workbench_items?.[0]?.count ?? 0,
        })
    );

    return NextResponse.json(withCounts);
  } catch (error) {
    console.error("Error fetching workbenches:", error);
    return NextResponse.json(
      { error: "Failed to fetch workbenches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bookmark_ids, items, own_additions } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // The designer's own prompt, captured at compose time.
    const ownAdditions =
      typeof own_additions === "string"
        ? own_additions.trim().slice(0, 2000)
        : "";

    // Normalize the two accepted shapes into one list of sources.
    // `items` carries per-source aspects + note tagged during compose;
    // `bookmark_ids` is the plain legacy shape.
    const sources: {
      bookmark_id: string;
      aspects: string[];
      comment: string;
    }[] = Array.isArray(items)
      ? items
          .filter(
            (i: { bookmark_id?: unknown }) => typeof i?.bookmark_id === "string"
          )
          .map(
            (i: { bookmark_id: string; aspects?: unknown; comment?: unknown }) => ({
              bookmark_id: i.bookmark_id,
              aspects: Array.isArray(i.aspects)
                ? i.aspects.filter(
                    (a: unknown): a is string =>
                      typeof a === "string" && VALID_ASPECTS.has(a)
                  )
                : [],
              comment:
                typeof i.comment === "string"
                  ? i.comment.trim().slice(0, 500)
                  : "",
            })
          )
      : Array.isArray(bookmark_ids)
        ? bookmark_ids
            .filter((id: unknown): id is string => typeof id === "string")
            .map((id: string) => ({ bookmark_id: id, aspects: [], comment: "" }))
        : [];

    const { data: workbench, error } = await supabase
      .from("workbenches")
      .insert({
        user_id: user.id,
        name,
        ...(ownAdditions ? { own_additions: ownAdditions } : {}),
      })
      .select()
      .single();

    if (error || !workbench) {
      console.error("Error creating workbench:", error);
      return NextResponse.json(
        { error: "Failed to create workbench" },
        { status: 500 }
      );
    }

    // Attach selected bookmarks as items, ensuring an analysis row for each
    if (sources.length > 0) {
      // Only keep bookmarks the user owns
      const { data: owned } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .in(
          "id",
          sources.map((s) => s.bookmark_id)
        );

      const ownedIds = new Set((owned || []).map((b: { id: string }) => b.id));

      let position = 0;
      for (const source of sources) {
        if (!ownedIds.has(source.bookmark_id)) continue;
        const analysisId = await ensureAnalysis(
          supabase,
          source.bookmark_id,
          user.id
        );
        await supabase.from("workbench_items").insert({
          workbench_id: workbench.id,
          bookmark_id: source.bookmark_id,
          analysis_id: analysisId,
          selection: {
            ...DEFAULT_SELECTION,
            aspects: source.aspects,
            comment: source.comment,
          },
          position: position++,
        });
      }
    }

    return NextResponse.json(workbench, { status: 201 });
  } catch (error) {
    console.error("Error creating workbench:", error);
    return NextResponse.json(
      { error: "Failed to create workbench" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name, own_additions } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Workbench ID is required" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("workbenches")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (own_additions !== undefined) updates.own_additions = own_additions;

    const { data: workbench, error } = await supabase
      .from("workbenches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating workbench:", error);
      return NextResponse.json(
        { error: "Failed to update workbench" },
        { status: 500 }
      );
    }

    return NextResponse.json(workbench);
  } catch (error) {
    console.error("Error updating workbench:", error);
    return NextResponse.json(
      { error: "Failed to update workbench" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Workbench ID is required" },
        { status: 400 }
      );
    }

    const { data: workbench } = await supabase
      .from("workbenches")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!workbench || workbench.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase.from("workbenches").delete().eq("id", id);

    if (error) {
      console.error("Error deleting workbench:", error);
      return NextResponse.json(
        { error: "Failed to delete workbench" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workbench:", error);
    return NextResponse.json(
      { error: "Failed to delete workbench" },
      { status: 500 }
    );
  }
}
