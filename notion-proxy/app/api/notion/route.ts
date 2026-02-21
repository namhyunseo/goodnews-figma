import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message:
      "Notion API proxy is running. Use POST with widget-key to fetch data.",
  });
}

export async function POST(request: NextRequest) {
  const WIDGET_SECRET_KEY =
    process.env.WIDGET_SECRET_KEY || "my_super_secret_key";
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = process.env.DATABASE_ID;

  if (!NOTION_TOKEN || !DATABASE_ID) {
    return NextResponse.json(
      { error: "Missing Notion integration credentials." },
      { status: 500 },
    );
  }

  const widgetKey = request.headers.get("x-widget-key");
  if (widgetKey !== WIDGET_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;

    // Query the database using pure fetch API to avoid Vercel Serverless SDK bundling issues
    const notionResponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    });

    if (!notionResponse.ok) {
      const errorText = await notionResponse.text();
      console.error("Notion API error details:", errorText);
      throw new Error(
        `Notion API returned ${notionResponse.status}: ${errorText}`,
      );
    }

    const data = await notionResponse.json();

    const parsedResults = (data.results || []).map((item: any) => {
      const properties = item.properties || {};

      // Name title extract
      const titleProp = properties.Name?.title || [];
      const title = titleProp.length > 0 ? titleProp[0].plain_text : "No Title";

      // Status extract
      const statusProp = properties.Status?.select;
      const status = statusProp
        ? statusProp.name
        : properties.Status?.status?.name || "No Status";

      return {
        id: item.id,
        title,
        status,
      };
    });

    // Setting CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-widget-key",
    };

    return NextResponse.json(
      { results: parsedResults },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error: any) {
    console.error("Notion API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Notion data" },
      { status: 500 },
    );
  }
}

// OPTIONS method to handle CORS preflight request
export async function OPTIONS() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-widget-key",
  };

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
