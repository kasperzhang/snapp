import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bookmarkId = searchParams.get("bookmark_id");

    let query = supabase
      .from("site_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (bookmarkId) {
      query = query.eq("bookmark_id", bookmarkId);
    }

    const { data: analyses, error } = await query;

    if (error) {
      console.error("Error fetching analyses:", error);
      return NextResponse.json(
        { error: "Failed to fetch analyses" },
        { status: 500 }
      );
    }

    return NextResponse.json(analyses || []);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
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
    const { bookmark_id } = body;

    if (!bookmark_id) {
      return NextResponse.json(
        { error: "Bookmark ID is required" },
        { status: 400 }
      );
    }

    // Verify bookmark ownership
    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("id, user_id")
      .eq("id", bookmark_id)
      .single();

    if (bookmarkError || !bookmark || bookmark.user_id !== user.id) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    // Check if analysis already exists for this bookmark
    const { data: existingAnalysis } = await supabase
      .from("site_analyses")
      .select("id")
      .eq("bookmark_id", bookmark_id)
      .single();

    if (existingAnalysis) {
      // Return existing analysis
      const { data: analysis } = await supabase
        .from("site_analyses")
        .select("*")
        .eq("id", existingAnalysis.id)
        .single();

      return NextResponse.json(analysis);
    }

    // Create new analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from("site_analyses")
      .insert({
        bookmark_id,
        user_id: user.id,
        analysis_status: "pending",
      })
      .select()
      .single();

    if (analysisError) {
      console.error("Error creating analysis:", analysisError);
      return NextResponse.json(
        { error: "Failed to create analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    console.error("Error creating analysis:", error);
    return NextResponse.json(
      { error: "Failed to create analysis" },
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
        { error: "Analysis ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: analysis } = await supabase
      .from("site_analyses")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase.from("site_analyses").delete().eq("id", id);

    if (error) {
      console.error("Error deleting analysis:", error);
      return NextResponse.json(
        { error: "Failed to delete analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting analysis:", error);
    return NextResponse.json(
      { error: "Failed to delete analysis" },
      { status: 500 }
    );
  }
}
