import { NextRequest, NextResponse } from "next/server";

export const revalidate = 600; // 10 min ISR

interface NotionBlock {
  id: string;
  type: string;
  bulleted_list_item?: { rich_text: { plain_text: string }[] };
  to_do?: { rich_text: { plain_text: string }[]; checked: boolean };
}

interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
}

async function fetchItems(pageId: string, apiKey: string): Promise<TodoItem[]> {
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
    .map((b): TodoItem | null => {
      if (b.type === "bulleted_list_item") {
        const text = b.bulleted_list_item?.rich_text.map((r) => r.plain_text).join("") ?? "";
        return text ? { id: b.id, text, checked: false } : null;
      }
      if (b.type === "to_do") {
        const text = b.to_do?.rich_text.map((r) => r.plain_text).join("") ?? "";
        return text ? { id: b.id, text, checked: b.to_do?.checked ?? false } : null;
      }
      return null;
    })
    .filter((t): t is TodoItem => t !== null && !t.checked);
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

export async function PATCH(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 });
  }

  const { blockId } = await req.json();
  if (!blockId || typeof blockId !== "string") {
    return NextResponse.json({ error: "Missing blockId" }, { status: 400 });
  }

  try {
    // Fetch the block to determine its type
    const getRes = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (!getRes.ok) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }
    const block: NotionBlock = await getRes.json();

    if (block.type === "to_do") {
      // Check off the to_do item
      const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to_do: { checked: true } }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Notion PATCH error:", err);
        return NextResponse.json({ error: "Failed to update block" }, { status: res.status });
      }
    } else {
      // For bulleted_list_item or other types, delete the block
      const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Notion-Version": "2022-06-28",
        },
      });
      if (!res.ok) {
        const err = await res.text();
        console.error("Notion DELETE error:", err);
        return NextResponse.json({ error: "Failed to delete block" }, { status: res.status });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notion PATCH error:", err);
    return NextResponse.json({ error: "Failed to update block" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY;
  const todoPageId = process.env.NOTION_TODO_DB;
  const workPageId = process.env.NOTION_WORK_DB;

  if (!apiKey || !todoPageId) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 });
  }

  const { text, list } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const pageId = list === "work" && workPageId ? workPageId : todoPageId;

  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        children: [{
          object: "block",
          type: "to_do",
          to_do: {
            rich_text: [{ type: "text", text: { content: text } }],
            checked: false,
          },
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Notion POST error:", err);
      return NextResponse.json({ error: "Failed to create todo" }, { status: res.status });
    }

    const data = await res.json();
    const block = data.results?.[0];
    return NextResponse.json({ id: block?.id, text });
  } catch (err) {
    console.error("Notion POST error:", err);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
