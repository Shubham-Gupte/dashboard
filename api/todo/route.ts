import { NextResponse } from "next/server";

export const revalidate = 600; // 10 min ISR

interface NotionBlock {
  type: string;
  bulleted_list_item?: { rich_text: { plain_text: string }[] };
  to_do?: { rich_text: { plain_text: string }[]; checked: boolean };
}

async function fetchItems(pageId: string, apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children?page_size=50`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return [];
  const data: { results: NotionBlock[] } = await res.json();
  return data.results
    .map((b) => {
      if (b.type === "bulleted_list_item") {
        return b.bulleted_list_item?.rich_text.map((r) => r.plain_text).join("") ?? "";
      }
      if (b.type === "to_do") {
        return b.to_do?.rich_text.map((r) => r.plain_text).join("") ?? "";
      }
      return "";
    })
    .filter((t) => t.length > 0);
}

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const todoPageId = process.env.NOTION_TODO_DB;
  const workPageId = process.env.NOTION_WORK_DB;

  if (!apiKey || !todoPageId) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 });
  }

  try {
    const [personal, work] = await Promise.all([
      fetchItems(todoPageId, apiKey),
      workPageId ? fetchItems(workPageId, apiKey) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      personal,
      work,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Notion API error:", err);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}
