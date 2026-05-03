import { NextResponse } from "next/server";
import { STATE_AVERAGE_TAX } from "@/lib/tax-data";

const ZERO_TAX_STATES = new Set(["OR", "DE", "MT", "NH", "AK"]);

export async function GET() {
  try {
    const response = await fetch("https://ipapi.co/json/", {
      // Users expect most recent data; disable caching.
      cache: "no-store",
      headers: {
        "User-Agent": "TipSplit/1.0 (tipsplit.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`Upstream request failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      region_code?: string;
      region?: string;
      country?: string;
      postal?: string;
      city?: string;
    };

    const regionCode = data.region_code?.toUpperCase();
    const rate = regionCode ? STATE_AVERAGE_TAX[regionCode] : undefined;
    const zeroTax = regionCode ? ZERO_TAX_STATES.has(regionCode) : false;

    return NextResponse.json({
      ok: Boolean(zeroTax || rate),
      rate: zeroTax ? 0 : rate,
      regionCode,
      regionName: data.region,
      city: data.city,
      postal: data.postal,
      country: data.country,
      zeroTax,
    });
  } catch (error) {
    console.error("Tax lookup error", error);
    return NextResponse.json(
      { ok: false, message: "Unable to resolve tax suggestion" },
      { status: 500 }
    );
  }
}
