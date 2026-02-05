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
    const search = searchParams.get("search");
    const tagIds = searchParams.get("tags")?.split(",").filter(Boolean);

    let query = supabase
      .from("bookmarks")
      .select(
        `
        *,
        tags:bookmark_tags(tag:tags(*))
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Apply search filter
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%,domain.ilike.%${search}%`
      );
    }

    const { data: bookmarks, error } = await query;

    if (error) {
      console.error("Error fetching bookmarks:", error);
      return NextResponse.json(
        { error: "Failed to fetch bookmarks" },
        { status: 500 }
      );
    }

    // Transform the data to flatten nested relations
    const transformedBookmarks = bookmarks?.map((bookmark) => ({
      ...bookmark,
      tags: bookmark.tags?.map((t: { tag: unknown }) => t.tag).filter(Boolean) || [],
    }));

    // Filter by tags (client-side for simplicity)
    let filteredBookmarks = transformedBookmarks;
    if (tagIds && tagIds.length > 0) {
      filteredBookmarks = transformedBookmarks?.filter((bookmark) =>
        tagIds.some((tagId) =>
          bookmark.tags?.some((tag: { id: string }) => tag.id === tagId)
        )
      );
    }

    return NextResponse.json(filteredBookmarks || []);
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
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
    const {
      url,
      title,
      description,
      favicon_url,
      og_image_url,
      domain,
      tag_ids,
    } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Extract domain if not provided
    let bookmarkDomain = domain;
    if (!bookmarkDomain) {
      try {
        const parsedUrl = new URL(url);
        bookmarkDomain = parsedUrl.hostname.replace(/^www\./, "");
      } catch {
        bookmarkDomain = url;
      }
    }

    // Create bookmark
    const { data: bookmark, error: bookmarkError } = await supabase
      .from("bookmarks")
      .insert({
        user_id: user.id,
        url,
        title: title || bookmarkDomain,
        description,
        favicon_url,
        og_image_url,
        domain: bookmarkDomain,
      })
      .select()
      .single();

    if (bookmarkError) {
      console.error("Error creating bookmark:", bookmarkError);
      return NextResponse.json(
        { error: "Failed to create bookmark" },
        { status: 500 }
      );
    }

    // Add tags
    if (tag_ids && tag_ids.length > 0) {
      const tagInserts = tag_ids.map((tag_id: string) => ({
        bookmark_id: bookmark.id,
        tag_id,
      }));

      await supabase.from("bookmark_tags").insert(tagInserts);
    }

    // Fetch the complete bookmark with relations
    const { data: completeBookmark } = await supabase
      .from("bookmarks")
      .select(
        `
        *,
        tags:bookmark_tags(tag:tags(*))
      `
      )
      .eq("id", bookmark.id)
      .single();

    const transformedBookmark = {
      ...completeBookmark,
      tags: completeBookmark?.tags?.map((t: { tag: unknown }) => t.tag).filter(Boolean) || [],
    };

    return NextResponse.json(transformedBookmark, { status: 201 });
  } catch (error) {
    console.error("Error creating bookmark:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
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
        { error: "Bookmark ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: bookmark } = await supabase
      .from("bookmarks")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!bookmark || bookmark.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete bookmark (cascade will handle junction tables)
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting bookmark:", error);
      return NextResponse.json(
        { error: "Failed to delete bookmark" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
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

    const body = await request.json();
    const { id, title, description, tag_ids } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Bookmark ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: bookmark } = await supabase
      .from("bookmarks")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!bookmark || bookmark.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update bookmark
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const { error: updateError } = await supabase
      .from("bookmarks")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating bookmark:", updateError);
      return NextResponse.json(
        { error: "Failed to update bookmark" },
        { status: 500 }
      );
    }

    // Update tags if provided
    if (tag_ids !== undefined) {
      // Delete existing tags
      await supabase.from("bookmark_tags").delete().eq("bookmark_id", id);

      // Add new tags
      if (tag_ids.length > 0) {
        const tagInserts = tag_ids.map((tag_id: string) => ({
          bookmark_id: id,
          tag_id,
        }));
        await supabase.from("bookmark_tags").insert(tagInserts);
      }
    }

    // Fetch updated bookmark
    const { data: updatedBookmark } = await supabase
      .from("bookmarks")
      .select(
        `
        *,
        tags:bookmark_tags(tag:tags(*))
      `
      )
      .eq("id", id)
      .single();

    const transformedBookmark = {
      ...updatedBookmark,
      tags: updatedBookmark?.tags?.map((t: { tag: unknown }) => t.tag).filter(Boolean) || [],
    };

    return NextResponse.json(transformedBookmark);
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 }
    );
  }
}
