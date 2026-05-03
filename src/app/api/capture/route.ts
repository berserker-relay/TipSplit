import { NextResponse } from "next/server";
import { appendCapture } from "@/lib/capture";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await appendCapture({
      email: body.email,
      billFormatted: body.billFormatted,
      tipPercent: body.tipPercent,
      perPersonFormatted: body.perPersonFormatted,
      createdAt: new Date().toISOString(),
      source: body.source || "tipsplit-app",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Capture write failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
