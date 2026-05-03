import { NextResponse } from "next/server";
import { renderPdf } from "@/lib/pdf";

const slugifyBill = (formatted: string) => {
  const numeric = formatted.replace(/[^0-9.]/g, "");
  const amount = numeric ? Number(numeric).toFixed(2) : "0.00";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `tipsplit-${amount.replace(".", "p")}-${stamp}.pdf`;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fileName = slugifyBill(body.billFormatted);
    const fileUrl = await renderPdf({
      fileName,
      bill: body.billFormatted,
      taxPercent: body.taxPercent,
      servicePercent: body.servicePercent,
      tipPercent: body.tipPercent,
      tipBasisLabel: body.tipBasisLabel,
      peopleCount: body.peopleCount,
      breakdown: body.breakdown,
      perPersonFormatted: body.perPersonFormatted,
      tipPerPersonFormatted: body.tipPerPersonFormatted,
      kitchenReserveFormatted: body.kitchenReserveFormatted,
      insights: body.insights || [],
    });
    return NextResponse.json({ ok: true, file: fileUrl.startsWith("http") ? fileUrl : `/pdf/${fileName}` });
  } catch (error) {
    console.error("PDF render failed", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "PDF generation failed" },
      { status: 501 }
    );
  }
}
