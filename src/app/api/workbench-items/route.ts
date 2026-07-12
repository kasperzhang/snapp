import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SELECTION = { aspects: [], fonts: [], colors: [], comment: "" };

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

// Verify the workbench belongs to the user; returns true/false.
async function ownsWorkbench(
  supabase: SupabaseClient,
  workbenchId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("workbenches")
    .select("user_id")
    .eq("id", workbenchId)
    .single();
  return !!data && data.user_id === userId;
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

    const { workbench_id, bookmark_id } = await request.json();

    if (!workbench_id || !bookmark_id) {
      return NextResponse.json(
        { error: "workbench_id and bookmark_id are required" },
        { status: 400 }
      );
    }

    if (!(await ownsWorkbench(supabase, workbench_id, user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify the bookmark belongs to the user
    const { data: bookmark } = await supabase
      .from("bookmarks")
      .select("id, user_id")
      .eq("id", bookmark_id)
      .single();

    if (!bookmark || bookmark.user_id !== user.id) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    const analysisId = await ensureAnalysis(supabase, bookmark_id, user.id);

    // Next position = current item count
    const { count } = await supabase
      .from("workbench_items")
      .select("id", { count: "exact", head: true })
      .eq("workbench_id", workbench_id);

    const { data: item, error } = await supabase
      .from("workbench_items")
      .insert({
        workbench_id,
        bookmark_id,
        analysis_id: analysisId,
        selection: DEFAULT_SELECTION,
        position: count ?? 0,
      })
      .select("*, bookmark:bookmarks(*), analysis:site_analyses(*)")
      .single();

    if (error) {
      console.error("Error adding workbench item:", error);
      return NextResponse.json(
        { error: "Failed to add source" },
        { status: 500 }
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding workbench item:", error);
    return NextResponse.json({ error: "Failed to add source" }, { status: 500 });
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

    const { id, selection } = await request.json();

    if (!id || !selection) {
      return NextResponse.json(
        { error: "id and selection are required" },
        { status: 400 }
      );
    }

    // Verify ownership via the parent workbench
    const { data: item } = await supabase
      .from("workbench_items")
      .select("id, workbench_id")
      .eq("id", id)
      .single();

    if (!item || !(await ownsWorkbench(supabase, item.workbench_id, user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from("workbench_items")
      .update({ selection })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating workbench item:", error);
      return NextResponse.json(
        { error: "Failed to update source" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating workbench item:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
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
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data: item } = await supabase
      .from("workbench_items")
      .select("id, workbench_id")
      .eq("id", id)
      .single();

    if (!item || !(await ownsWorkbench(supabase, item.workbench_id, user.id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("workbench_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting workbench item:", error);
      return NextResponse.json(
        { error: "Failed to remove source" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workbench item:", error);
    return NextResponse.json(
      { error: "Failed to remove source" },
      { status: 500 }
    );
  }
}
