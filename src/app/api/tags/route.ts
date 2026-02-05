import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TAG_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E9", // Sky Blue
];

function getRandomColor() {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tags, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching tags:", error);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 }
      );
    }

    return NextResponse.json(tags || []);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
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
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check if tag with same name exists
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 409 }
      );
    }

    const { data: tag, error } = await supabase
      .from("tags")
      .insert({
        user_id: user.id,
        name,
        color: color || getRandomColor(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating tag:", error);
      return NextResponse.json(
        { error: "Failed to create tag" },
        { status: 500 }
      );
    }

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, name } = await request.json();

    if (!id || !name) {
      return NextResponse.json(
        { error: "Tag ID and name are required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existingTag } = await supabase
      .from("tags")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existingTag || existingTag.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if another tag with the same name exists
    const { data: duplicate } = await supabase
      .from("tags")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", name)
      .neq("id", id)
      .single();

    if (duplicate) {
      return NextResponse.json(
        { error: "Tag with this name already exists" },
        { status: 409 }
      );
    }

    const { data: tag, error } = await supabase
      .from("tags")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating tag:", error);
      return NextResponse.json(
        { error: "Failed to update tag" },
        { status: 500 }
      );
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
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
        { error: "Tag ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: tag } = await supabase
      .from("tags")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!tag || tag.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete tag (cascade will handle bookmark_tags)
    const { error } = await supabase.from("tags").delete().eq("id", id);

    if (error) {
      console.error("Error deleting tag:", error);
      return NextResponse.json(
        { error: "Failed to delete tag" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
