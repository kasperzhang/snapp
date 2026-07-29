import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ilikeContains } from "@/lib/db/filters";
import { BOOKMARKS_PAGE_SIZE, pageCount } from "@/lib/pagination";

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

    const requestedPage = Math.max(1, Number(searchParams.get("page")) || 1);
    const untaggedOnly = searchParams.get("untagged") === "1";

    // Bookmarks carrying no tag at all. Expressed as an exclusion because
    // there's no row to match on — the absence of a join row is the condition.
    let excludeIds: string[] | null = null;
    if (untaggedOnly) {
      const { data: tagged } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id");
      const ids = [...new Set((tagged ?? []).map((t) => t.bookmark_id))];
      excludeIds = ids.length > 0 ? ids : null;
    }

    // Tag filter has to happen in the query, not after it — filtering a page
    // that was already sliced would drop rows that belong on it. Resolving to
    // ids first keeps the join out of the paginated select.
    let taggedIds: string[] | null = null;
    if (tagIds && tagIds.length > 0) {
      const { data: tagged } = await supabase
        .from("bookmark_tags")
        .select("bookmark_id")
        .in("tag_id", tagIds);

      taggedIds = [...new Set((tagged ?? []).map((t) => t.bookmark_id))];
      if (taggedIds.length === 0) {
        const { count: all } = await supabase
          .from("bookmarks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        return NextResponse.json({
          items: [],
          total: 0,
          libraryTotal: all ?? 0,
          page: 1,
          pageSize: BOOKMARKS_PAGE_SIZE,
        });
      }
    }

    // A supabase query builder is single-use, and the count has to be known
    // before the range is chosen — asking for a range past the end is a
    // PostgREST error, not an empty page.
    const buildQuery = (columns: string, head: boolean) => {
      let q = supabase
        .from("bookmarks")
        .select(columns, { count: "exact", head })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (taggedIds) q = q.in("id", taggedIds);
      if (excludeIds) q = q.not("id", "in", `(${excludeIds.join(",")})`);
      // The term is quoted and its wildcards escaped — a raw comma would
      // otherwise split this into extra conditions.
      if (search) {
        q = q.or(
          ["title", "description", "url", "domain"]
            .map((col) => ilikeContains(col, search))
            .join(",")
        );
      }
      return q;
    };

    const { count: total, error: countError } = await buildQuery("id", true);
    if (countError) {
      console.error("Error counting bookmarks:", countError);
      return NextResponse.json(
        { error: "Failed to fetch bookmarks" },
        { status: 500 }
      );
    }

    // The sidebar's "All" row reports the library, not the filtered set —
    // it's the control that clears the filter. Only worth a second query when
    // a filter is actually narrowing things.
    let libraryTotal = total ?? 0;
    if (search || taggedIds || untaggedOnly) {
      const { count: all } = await supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      libraryTotal = all ?? 0;
    }

    // Clamp rather than 500: deleting rows can strand the client on a page
    // that no longer exists.
    const page = Math.min(
      requestedPage,
      pageCount(total ?? 0, BOOKMARKS_PAGE_SIZE)
    );
    const from = (page - 1) * BOOKMARKS_PAGE_SIZE;

    const { data: bookmarks, error } = await buildQuery(
      `
        *,
        tags:bookmark_tags(tag:tags(*)),
        analyses:site_analyses(screenshot_url,analysis_status,created_at)
      `,
      false
    ).range(from, from + BOOKMARKS_PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching bookmarks:", error);
      return NextResponse.json(
        { error: "Failed to fetch bookmarks" },
        { status: 500 }
      );
    }

    // Transform the data to flatten nested relations. The select string is
    // built at runtime, so supabase can't infer the row shape — declare it.
    interface RawRow {
      analyses?: {
        screenshot_url: string | null;
        analysis_status: string;
        created_at: string;
      }[] | null;
      tags?: { tag: unknown }[] | null;
      [key: string]: unknown;
    }
    const transformedBookmarks = (bookmarks as unknown as RawRow[] | null)?.map(
      (bookmark) => {
        // A bookmark can be scanned more than once — take the newest scan that
        // actually produced a screenshot. It's the card's preferred preview.
        const shot = (bookmark.analyses ?? [])
          .filter((a) => a.screenshot_url)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const { analyses: _analyses, ...rest } = bookmark;
        return {
          ...rest,
          tags: (bookmark.tags ?? []).map((t) => t.tag).filter(Boolean),
          screenshot_url: shot?.screenshot_url ?? null,
        };
      }
    );

    return NextResponse.json({
      items: transformedBookmarks ?? [],
      total: total ?? 0,
      libraryTotal,
      page,
      pageSize: BOOKMARKS_PAGE_SIZE,
    });
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
