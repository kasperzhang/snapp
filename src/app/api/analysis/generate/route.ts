import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { ExtractedFont, ExtractedColor } from "@/types";

const anthropic = new Anthropic();

function buildPrompt(fonts: ExtractedFont[], colors: ExtractedColor[], url: string): string {
  const fontList = fonts
    .map((f) => `- ${f.family} (${f.weights.join(", ")}) - ${f.source} font, used for ${f.usage}`)
    .join("\n");

  const colorList = colors
    .map((c) => `- ${c.hex} (RGB: ${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}) - ${c.context} color, frequency: ${c.frequency}`)
    .join("\n");

  return `You are an expert UI/UX designer. Analyze the following design elements extracted from ${url} and create a comprehensive design replication guide.

## Extracted Fonts:
${fontList || "No fonts detected"}

## Extracted Colors:
${colorList || "No colors detected"}

Based on this data, create a detailed design guide with the following sections:

1. **Design Philosophy Summary** (2-3 sentences)
   Describe the overall aesthetic, mood, and design approach of this website.

2. **Typography System**
   - Recommended font pairings
   - Type scale (headings, body text, captions)
   - Line height and letter spacing recommendations

3. **Color System**
   - Semantic color naming (primary, secondary, accent, background, text)
   - Color palette organization
   - Light/dark mode considerations

4. **Component Patterns**
   - Button styles and states
   - Card layouts and shadows
   - Spacing rhythm (8px grid, etc.)

5. **Implementation Guide**
   Provide ready-to-use code for:

   a) Tailwind CSS config extension:
   \`\`\`javascript
   // tailwind.config.js extend
   \`\`\`

   b) CSS Custom Properties:
   \`\`\`css
   :root {
     /* Your design tokens */
   }
   \`\`\`

Be specific and practical. Focus on creating a usable design system that can be immediately implemented.`;
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
    const { analysis_id } = body;

    if (!analysis_id) {
      return NextResponse.json(
        { error: "Analysis ID is required" },
        { status: 400 }
      );
    }

    // Fetch analysis with bookmark info
    const { data: analysis, error: analysisError } = await supabase
      .from("site_analyses")
      .select(`
        *,
        bookmark:bookmarks(url)
      `)
      .eq("id", analysis_id)
      .single();

    if (analysisError || !analysis || analysis.user_id !== user.id) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (!analysis.fonts || !analysis.colors) {
      return NextResponse.json(
        { error: "Analysis must be completed before generating design prompt" },
        { status: 400 }
      );
    }

    const url = (analysis.bookmark as { url: string })?.url || "the website";
    const prompt = buildPrompt(
      analysis.fonts as ExtractedFont[],
      analysis.colors as ExtractedColor[],
      url
    );

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const designPrompt = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    // Update analysis with generated prompt
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from("site_analyses")
      .update({
        design_prompt: designPrompt,
      })
      .eq("id", analysis_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating analysis:", updateError);
      return NextResponse.json(
        { error: "Failed to save design prompt" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedAnalysis);
  } catch (error) {
    console.error("Error generating design prompt:", error);
    return NextResponse.json(
      { error: "Failed to generate design prompt" },
      { status: 500 }
    );
  }
}
