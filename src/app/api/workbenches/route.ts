import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SELECTION = { aspects: [], fonts: [], colors: [], comment: "" };

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

      return NextResponse.json(workbench);
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
      (w: { workbench_items?: { count: number }[] }) => ({
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
    const { name, bookmark_ids } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: workbench, error } = await supabase
      .from("workbenches")
      .insert({
        user_id: user.id,
        name,
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
    if (Array.isArray(bookmark_ids) && bookmark_ids.length > 0) {
      // Only keep bookmarks the user owns
      const { data: owned } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .in("id", bookmark_ids);

      const ownedIds = new Set((owned || []).map((b: { id: string }) => b.id));

      let position = 0;
      for (const bookmarkId of bookmark_ids) {
        if (!ownedIds.has(bookmarkId)) continue;
        const analysisId = await ensureAnalysis(supabase, bookmarkId, user.id);
        await supabase.from("workbench_items").insert({
          workbench_id: workbench.id,
          bookmark_id: bookmarkId,
          analysis_id: analysisId,
          selection: DEFAULT_SELECTION,
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
