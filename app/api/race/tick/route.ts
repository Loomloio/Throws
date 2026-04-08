import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/racing/engine";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await tick();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Race tick error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tick failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Use POST" }, { status: 405 });
  }
  try {
    const result = await tick();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tick failed" },
      { status: 500 }
    );
  }
}
