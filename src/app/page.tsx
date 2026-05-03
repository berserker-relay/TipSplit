"use client";

import { useEffect, useMemo, useState, startTransition } from "react";
import { CITY_TAX_PRESETS } from "@/lib/tax-data";

const TIP_PRESETS = [12, 15, 18, 20, 22];
const BILL_GUIDE_SECTIONS = [
  {
    title: "1. Map the venue's real bill structure",
    paragraphs: [
      "Start by pulling apart every line the venue can add before you ever touch the tip slider. Menus rarely mention large-party surcharges, credit-card offsets, or wellness fees until the receipt hits the table, so capture them in the service charge input. If the venue runs auto-gratuity, treat it as a service fee: it's compensation, not the discretionary tip you're about to calculate.",
      "Ask for a manager clarification when the wording is vague. Some restaurants add both a 'hospitality fee' and expect a tip on top; others intend the fee to replace gratuity entirely. Document the answer in the notes field so the rest of the party has the same reference point when the next round of drinks lands."],
  },
  {
    title: "2. Set the baseline before emotions enter",
    paragraphs: [
      "Once every mandatory fee is accounted for, the calculator's bill + tax + service subtotal becomes the impartial baseline. Share that number with the table before debating tip percentages. When everyone can see the math, the conversation shifts from 'I feel' to 'The baseline is $187.42—what generosity layer do we add?'.",
      "Use the split controls to preview outcomes for different party sizes or share arrangements. If one person is covering the bar tab separately, remove their headcount so your per-person figures reflect reality. Precision in the baseline prevents resentment later."],
  },
  {
    title: "3. Separate service charges from gratuity",
    paragraphs: [
      "Cities like New York and Los Angeles are flooded with 3–5% 'equity fees' that legally belong to the house. TipSplit keeps that field distinct so you never double-tip. Enter the service percentage exactly as printed, then choose whether your discretionary tip applies to pre- or post-tax totals based on local norms.",
      "If management claims their service fee is shared with staff, ask how it's distributed. Many operators still use those funds for back-office costs. When the answer is fuzzy, tip as though the staff sees none of it—that mindset earns trust with servers who recognize when guests are making informed choices."],
  },
  {
    title: "4. Design a split that matches participation",
    paragraphs: [
      "Uniform splits are fast, but not always fair. Use the adjustment notes (coming next release) to earmark bigger shares for steak-and-bottle orders while keeping appetizers communal. Until that ships, communicate verbally and use the per-person card as the average everyone should converge on once specialty items are reconcilied.",
      "For mixed cash/card tables, let TipSplit define the total and assign one card-holder as the reconciler. They can send the shareable link over text so cash contributors see the final math—including taxes and rounding—and can reimburse precisely via P2P apps."],
  },
  {
    title: "5. Plan for rounding and register realities",
    paragraphs: [
      "Bartenders love round numbers; your POS might not. The rounding controls tweak only the tip line so you can land on clean totals without starving the team. Flip to 'nearest' when you want a symmetrical outcome, or 'up' when you want to push a little extra value into the tip jar without punching a calculator again.",
      "Always announce the chosen rounding to the table. People rarely object to an extra forty cents per head when they understand it's going to the staff, but they resent surprises. Transparency keeps social capital intact."],
  },
  {
    title: "6. Capture proof for reimbursements and taxes",
    paragraphs: [
      "Whether you expense meals, split amongst business partners, or log cash tips for tax filings, export everything. The TXT export mirrors what you'd scribble on a receipt; the CSV feeds spreadsheets and accounting software. PDF export is on deck so you can attach pristine breakdowns to compliance workflows.",
      "For hospitality teams, encourage servers to save their nightly splits. Historical data becomes leverage during review cycles when you can prove average tip-outs per shift and show the variance introduced by service-fee policies."],
  },
  {
    title: "7. Use captured emails as operational signals",
    paragraphs: [
      "When guests opt to email the breakdown, they're also opting into higher-fidelity communication. Tag them (with consent) based on venue, party size, and generosity. Those signals feed the Hospitality Cashflow briefing so everyone—from independent operators to multi-location groups—sees how tipping sentiment is shifting.",
      "For internal teams, email captures become a lightweight CRM: managers know which hosts closed large bills, finance gets a clean audit trail, and marketing sees patterns around check size, daypart, and promotional lift."],
  },
  {
    title: "8. Close the loop with staff-facing insights",
    paragraphs: [
      "TipSplit isn't just for guests. Shift leads can plug in the actual numbers from the POS at the end of the night, note the kitchen share slider position, and confirm everyone was paid according to policy. The insights tiles become a nightly recap board without ever opening Excel.",
      "Aggregate the anonymized data weekly: average tip percent, most common rounding choice, share of parties using service-fee-heavy venues. Those metrics fuel decisions about staffing, menu pricing, and whether your location needs signage clarifying how fees work."],
  },
];
const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type RoundingMode = "none" | "nearest" | "up";
type TipBasis = "preTax" | "postTax";

type BreakdownRow = {
  label: string;
  value: number;
};

const formatCurrency = (value: number) => formatter.format(isNaN(value) ? 0 : value);

const clamp = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

type PlausibleFn = (name: string, options?: { props?: Record<string, unknown> }) => void;

const trackEvent = (name: string, props?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  const plausible = (window as typeof window & { plausible?: PlausibleFn }).plausible;
  if (typeof plausible === "function") {
    plausible(name, { props });
  }
};

export default function Home() {
  const [billAmount, setBillAmount] = useState("120");
  const [taxPercent, setTaxPercent] = useState("8.875");
  const [servicePercent, setServicePercent] = useState("0");
  const [selectedTipOption, setSelectedTipOption] = useState<number | "custom">(20);
  const [customTip, setCustomTip] = useState("22");
  const [tipBasis, setTipBasis] = useState<TipBasis>("preTax");
  const [peopleCount, setPeopleCount] = useState(2);
  const [roundingMode, setRoundingMode] = useState<RoundingMode>("none");
  const [kitchenShare, setKitchenShare] = useState(20);
  const [email, setEmail] = useState("");
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [lookupStatus, setLookupStatus] = useState<
    | { state: "idle" }
    | { state: "loading" }
    | { state: "resolved"; message: string }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading" | "error">("idle");
  const [lastPdfPath, setLastPdfPath] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const stored = window.localStorage.getItem("tipsplit:lastSession");
    const payload =
      params.size > 0
        ? Object.fromEntries(params.entries())
        : stored
          ? (JSON.parse(stored) as Record<string, string>)
          : null;

    if (!payload) return;

    startTransition(() => {
      if (payload.bill) setBillAmount(payload.bill);
      if (payload.tax) setTaxPercent(payload.tax);
      if (payload.service) setServicePercent(payload.service);
      if (payload.tip) {
        setCustomTip(payload.tip);
        if (payload.tipPreset === "custom") {
          setSelectedTipOption("custom");
        } else if (payload.tipPreset) {
          setSelectedTipOption(Number(payload.tipPreset));
        }
      }
      if (payload.tipBasis) setTipBasis(payload.tipBasis as TipBasis);
      if (payload.people) setPeopleCount(Number(payload.people));
      if (payload.rounding) setRoundingMode(payload.rounding as RoundingMode);
      if (payload.kitchen) setKitchenShare(Number(payload.kitchen));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = {
      bill: billAmount,
      tax: taxPercent,
      service: servicePercent,
      tip: customTip,
      tipPreset: selectedTipOption,
      tipBasis,
      people: peopleCount,
      rounding: roundingMode,
      kitchen: kitchenShare,
    };
    window.localStorage.setItem("tipsplit:lastSession", JSON.stringify(data));
  }, [
    billAmount,
    taxPercent,
    servicePercent,
    customTip,
    selectedTipOption,
    tipBasis,
    peopleCount,
    roundingMode,
    kitchenShare,
  ]);

  const tipPercent = useMemo(() => {
    if (selectedTipOption === "custom") {
      const customValue = parseFloat(customTip);
      return Number.isFinite(customValue) ? customValue : 0;
    }
    return selectedTipOption;
  }, [selectedTipOption, customTip]);

  const {
    breakdown,
    tipAmount,
    totalPerPerson,
    tipPerPerson,
    kitchenAllocation,
    roundingDelta,
  } = useMemo(() => {
    const bill = parseFloat(billAmount) || 0;
    const tax = bill * ((parseFloat(taxPercent) || 0) / 100);
    const service = bill * ((parseFloat(servicePercent) || 0) / 100);
    const tipBase = tipBasis === "preTax" ? bill + service : bill + service + tax;
    const rawTip = tipBase * (tipPercent / 100);
    const subtotal = bill + tax + service + rawTip;

    let adjustedTip = rawTip;
    let roundingAdjustment = 0;
    let roundedTotal = subtotal;

    if (roundingMode !== "none") {
      const target = roundingMode === "nearest" ? Math.round(subtotal) : Math.ceil(subtotal);
      roundingAdjustment = target - subtotal;
      adjustedTip = Math.max(rawTip + roundingAdjustment, 0);
      roundedTotal = target;
    }

    const shareCount = clamp(peopleCount, 1, 20);
    const perPerson = roundedTotal / shareCount;
    const perPersonTip = adjustedTip / shareCount;
    const kitchenShareAmount = adjustedTip * (kitchenShare / 100);

    const rows: BreakdownRow[] = [
      { label: "Bill", value: bill },
      { label: "Tax", value: tax },
      { label: "Service", value: service },
      { label: "Tip", value: adjustedTip },
      { label: "Total", value: roundedTotal },
    ];

    return {
      breakdown: rows,
      tipAmount: adjustedTip,
      totalPerPerson: perPerson,
      tipPerPerson: perPersonTip,
      kitchenAllocation: kitchenShareAmount,
      roundingDelta: roundingAdjustment,
    };
  }, [
    billAmount,
    taxPercent,
    servicePercent,
    tipBasis,
    tipPercent,
    roundingMode,
    peopleCount,
    kitchenShare,
  ]);

  const requestLocationSuggestion = async () => {
    try {
      setLookupStatus({ state: "loading" });
      const response = await fetch("/api/tax-lookup");
      const payload = await response.json();

      if (!response.ok || !payload?.rate) {
        throw new Error(payload?.message ?? "No rate available");
      }

      setTaxPercent((payload.rate ?? 0).toString());
      const descriptor = [payload.city, payload.regionName, payload.regionCode]
        .filter(Boolean)
        .join(", ");
      const baseMessage = payload.zeroTax
        ? "Your state typically doesn't tax restaurant meals."
        : "Loaded regional average";
      setLookupStatus({
        state: "resolved",
        message: `${baseMessage}${descriptor ? ` for ${descriptor}` : ""}.`,
      });
    } catch (error) {
      console.error(error);
      setLookupStatus({
        state: "error",
        message: "Couldn’t auto-detect your tax rate. Pick a preset.",
      });
    }
  };

  const handleCapture = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    try {
      setCaptureStatus("loading");
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          billFormatted,
          tipPercent,
          perPersonFormatted,
          source: "tipsplit-app",
        }),
      });

      if (!response.ok) {
        throw new Error("Capture failed");
      }

      setCaptureStatus("success");
      setEmail("");
      trackEvent("email_capture", {
        tip_percent: tipPercent,
        people: peopleCount,
      });
      setTimeout(() => setCaptureStatus("idle"), 4000);
    } catch (error) {
      console.error(error);
      setCaptureStatus("error");
      setTimeout(() => setCaptureStatus("idle"), 4000);
    }
  };

  const handleCopy = async () => {
    const text = breakdown
      .map((row) => `${row.label}: ${formatCurrency(row.value)}`)
      .concat([
        `Per person: ${formatCurrency(totalPerPerson)}`,
        `Tip per person: ${formatCurrency(tipPerPerson)}`,
      ])
      .join("\n");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleDownloadCsv = () => {
    const rows = [["Label", "Amount"], ...breakdown.map((row) => [row.label, row.value.toFixed(2)]), [
      "Per person",
      totalPerPerson.toFixed(2),
    ], [
      "Tip per person",
      tipPerPerson.toFixed(2),
    ]];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tipsplit-breakdown.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareLink = async () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams({
      bill: billAmount,
      tax: taxPercent,
      service: servicePercent,
      tip: customTip,
      tipPreset: selectedTipOption === "custom" ? "custom" : selectedTipOption.toString(),
      tipBasis,
      people: peopleCount.toString(),
      rounding: roundingMode,
      kitchen: kitchenShare.toString(),
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      trackEvent("share_link_copied", { people: peopleCount });
      setTimeout(() => setShareStatus("idle"), 2200);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([
      `TipSplit breakdown\n\n` +
        breakdown
          .map((row) => `${row.label}: ${formatCurrency(row.value)}`)
          .join("\n") +
        `\n\nPer person: ${formatCurrency(totalPerPerson)}` +
        `\nTip per person: ${formatCurrency(tipPerPerson)}`,
    ], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tipsplit-breakdown.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const insights = [
    {
      label: `${tipPercent.toFixed(1)}% tip`,
      value: formatCurrency(tipAmount),
      caption: `Based on ${tipBasis === "preTax" ? "pre-tax" : "post-tax"} subtotal`,
    },
    {
      label: roundingMode === "none" ? "No rounding" : "Rounding impact",
      value:
        roundingMode === "none"
          ? "—"
          : `${roundingDelta > 0 ? "+" : ""}${formatCurrency(roundingDelta)}`,
      caption:
        roundingMode === "none"
          ? "Totals are exact"
          : `Adjusted tip to reach ${(roundingMode === "nearest" ? "nearest" : "next").toUpperCase()} $`,
    },
    {
      label: `Kitchen share (${kitchenShare}%)`,
      value: formatCurrency(kitchenAllocation),
      caption: "Set aside for BOH pool",
    },
  ];

  const handleDownloadPdf = async () => {
    try {
      setPdfStatus("loading");
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billFormatted,
          taxPercent,
          servicePercent,
          tipPercent: tipPercent.toFixed(1),
          tipBasisLabel,
          peopleCount,
          breakdown: breakdown.map((row) => ({
            label: row.label,
            valueFormatted: formatCurrency(row.value),
          })),
          perPersonFormatted,
          tipPerPersonFormatted,
          kitchenReserveFormatted,
          insights,
        }),
      });

      if (!response.ok) {
        throw new Error("PDF request failed");
      }
      const data = await response.json();
      setPdfStatus("idle");
      window.open(data.file, "_blank");
      setLastPdfPath(data.file);
      trackEvent("download_pdf", { tip_percent: tipPercent, people: peopleCount });
    } catch (error) {
      console.error(error);
      setPdfStatus("error");
      setTimeout(() => setPdfStatus("idle"), 4000);
    }
  };

  const perPersonFormatted = formatCurrency(totalPerPerson);
  const tipPerPersonFormatted = formatCurrency(tipPerPerson);
  const kitchenReserveFormatted = formatCurrency(kitchenAllocation);
  const billFormatted = formatCurrency(parseFloat(billAmount) || 0);
  const tipBasisLabel =
    tipBasis === "preTax" ? "pre-tax + service" : "tax-inclusive";

  return (
    <div className="bg-slate-25 min-h-screen w-full text-slate-900">
      <header className="bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">TipSplit</p>
            <p className="text-lg font-semibold text-slate-900">
              Hospitality-ready bill intelligence
            </p>
          </div>
          <button className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:inline-flex">
            Get the weekly money signal
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-24 pt-10 md:px-6 lg:flex-row">
        <section className="flex-1 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm shadow-slate-200/40">
            <div className="mb-6 flex flex-col gap-2">
              <p className="text-sm font-semibold tracking-wide text-emerald-600">Live calculator</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                Split any bill in seconds
              </h1>
              <p className="text-base text-slate-600">
                Tip, tax, service, and kitchen share — optimized for that dimly lit dining room and on the-go accounting.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Bill amount
                <span className="text-xs font-normal text-slate-500">
                  Include pre-tax, pre-fee total from the receipt.
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={billAmount}
                  onChange={(event) => setBillAmount(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-inner focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Sales tax % (editable)
                <span className="text-xs font-normal text-slate-500">
                  Loaded from your region. Override it to match the printed receipt.
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxPercent}
                  onChange={(event) => setTaxPercent(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-inner focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={requestLocationSuggestion}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {lookupStatus.state === "loading" ? "Detecting…" : "Use my region"}
                  </button>
                  <span>or quick-fill:</span>
                  <div className="flex flex-wrap gap-1">
                    {CITY_TAX_PRESETS.slice(0, 4).map((preset) => (
                      <button
                        key={preset.city}
                        type="button"
                        onClick={() => setTaxPercent(preset.rate.toString())}
                        className="rounded-full border border-transparent bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        {preset.city} {preset.rate}%
                      </button>
                    ))}
                  </div>
                </div>
                {(lookupStatus.state === "resolved" || lookupStatus.state === "error") && (
                  <p
                    className={`text-xs ${
                      lookupStatus.state === "error" ? "text-rose-500" : "text-emerald-600"
                    }`}
                  >
                    {lookupStatus.message}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Service / venue fee %
                <span className="text-xs font-normal text-slate-500">
                  Add auto-grat, equity, wellness, or large-party surcharges here.
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={servicePercent}
                  onChange={(event) => setServicePercent(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-900 shadow-inner focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-slate-700">Split between</span>
                <div className="flex items-center gap-4">
                  <div className="flex flex-1 items-center rounded-2xl border border-slate-200 px-3 py-2">
                    <button
                      type="button"
                      aria-label="decrease"
                      onClick={() => setPeopleCount((prev) => Math.max(1, prev - 1))}
                      className="h-10 w-10 rounded-full border border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
                    >
                      –
                    </button>
                    <div className="flex-1 text-center text-2xl font-semibold text-slate-900">
                      {peopleCount}
                    </div>
                    <button
                      type="button"
                      aria-label="increase"
                      onClick={() => setPeopleCount((prev) => Math.min(20, prev + 1))}
                      className="h-10 w-10 rounded-full border border-slate-200 text-lg text-slate-700 hover:bg-slate-50"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-sm text-slate-500">people</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Tip %</p>
              <div className="flex flex-wrap gap-3">
                {TIP_PRESETS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSelectedTipOption(option);
                      setCustomTip(option.toString());
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      selectedTipOption === option
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {option}%
                  </button>
                ))}
                <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
                  <span>Custom</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={customTip}
                    aria-label="Custom tip percentage"
                    onChange={(event) => {
                      setSelectedTipOption("custom");
                      setCustomTip(event.target.value);
                    }}
                    className="w-16 border-0 bg-transparent text-right text-slate-900 focus:outline-none"
                  />
                  <span>%</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipBasis"
                    checked={tipBasis === "preTax"}
                    onChange={() => setTipBasis("preTax")}
                    className="accent-emerald-600"
                  />
                  Tip on pre-tax + service
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tipBasis"
                    checked={tipBasis === "postTax"}
                    onChange={() => setTipBasis("postTax")}
                    className="accent-emerald-600"
                  />
                  Tip on tax-inclusive total
                </label>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-slate-100 bg-white/70 p-4">
                <p className="text-sm font-semibold text-slate-700">Popular markets</p>
                <div className="grid grid-cols-2 gap-2">
                  {CITY_TAX_PRESETS.map((preset) => (
                    <button
                      key={`${preset.city}-${preset.rate}`}
                      type="button"
                      onClick={() => {
                        setLookupStatus({ state: "idle" });
                        setTaxPercent(preset.rate.toString());
                      }}
                      className="rounded-2xl border border-slate-100 px-3 py-2 text-left text-sm text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/60"
                    >
                      <span className="block font-semibold text-slate-900">
                        {preset.city}, {preset.state}
                      </span>
                      <span className="text-xs text-slate-500">
                        {preset.metro} · {preset.rate}%
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Tap any market to load its blended sales tax rate. Adjust manually for venue-specific rules.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-700">Rounding</p>
                <div className="flex gap-2">
                  {["none", "nearest", "up"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRoundingMode(mode as RoundingMode)}
                      className={`flex-1 rounded-full border px-3 py-2 text-sm capitalize ${
                        roundingMode === mode
                          ? "border-slate-900 bg-white text-slate-900"
                          : "border-transparent bg-transparent text-slate-500 hover:bg-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  Adjusts only the tip line to keep the math bartender-friendly.
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-emerald-900">
                  <span>Kitchen / BOH share</span>
                  <span>{kitchenShare}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={kitchenShare}
                  onChange={(event) => setKitchenShare(parseInt(event.target.value, 10))}
                  className="accent-emerald-600"
                />
                <p className="text-xs text-emerald-700">
                  Reserve a slice of the tip for bar-backs, dish, and kitchen crews.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Email the breakdown</p>
            <p className="text-base text-slate-600">
              Drop your email to get this session plus weekly Hospitality Cashflow notes.
            </p>
            <form onSubmit={handleCapture} className="mt-4 flex flex-col gap-3 md:flex-row">
              <input
                type="email"
                required
                placeholder="you@venue.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base shadow-inner focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={captureStatus === "loading"}
                className={`rounded-2xl px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-slate-900/20 transition-colors ${
                  captureStatus === "loading"
                    ? "bg-slate-500"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {captureStatus === "loading" ? "Sending…" : "Send it"}
              </button>
            </form>
            {captureStatus === "success" && (
              <p className="mt-3 text-sm font-medium text-emerald-600">
                Saved. Watch your inbox for the full report (and future automations).
              </p>
            )}
            {captureStatus === "error" && (
              <p className="mt-3 text-sm font-medium text-rose-600">
                Couldn’t save that email. Try again in a moment.
              </p>
            )}
          </div>
        </section>

        <aside className="w-full max-w-xl space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
              Output
            </p>
            <div className="mt-4 grid gap-2 text-base">
              {breakdown.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-slate-700">
                  <span>{row.label}</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-slate-900 px-5 py-4 text-white">
              <p className="text-sm uppercase tracking-wider text-slate-300">Each person</p>
              <p className="text-3xl font-semibold" data-testid="per-person-total">
                {formatCurrency(totalPerPerson)}
              </p>
              <p className="text-sm text-slate-200" data-testid="per-person-tip">
                Tip portion {formatCurrency(tipPerPerson)}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                Copy breakdown
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                Download txt
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex-1 rounded-2xl border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white"
                disabled={pdfStatus === "loading"}
              >
                {pdfStatus === "loading" ? "Rendering PDF…" : "Download PDF"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleShareLink}
                className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Copy sharable link
              </button>
              {shareStatus === "copied" && (
                <span className="text-xs font-medium text-emerald-600">URL copied — send to the table.</span>
              )}
              {pdfStatus === "error" && (
                <span className="text-xs font-medium text-rose-600">PDF failed — try again.</span>
              )}
              {lastPdfPath && (
                <a
                  href={lastPdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline"
                >
                  Open last PDF export
                </a>
              )}
            </div>
            <button className="mt-3 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              Add to Tip Ledger (beta)
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {insights.map((insight) => (
              <div
                key={insight.label}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-inner shadow-white"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{insight.label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{insight.value}</p>
                <p className="text-xs text-slate-500">{insight.caption}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">Guide</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">
              How to split a restaurant bill in 2026
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              The tipping landscape is messy—service fees, auto-grat, equity surcharges, and friends who swear they “only had a salad.” Use these field notes to keep every bill fair, transparent, and auditable.
            </p>
            <div className="mt-6 space-y-6">
              {BILL_GUIDE_SECTIONS.map((section) => (
                <article key={section.title} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                  {section.paragraphs.map((copy) => (
                    <p key={copy.slice(0, 32)} className="text-sm leading-relaxed text-slate-600">
                      {copy}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-900 bg-slate-900/90 p-5 text-white">
              <h4 className="text-lg font-semibold">Key takeaways</h4>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-100">
                <li>Dissect the receipt before tipping so mandatory fees never sneak into discretionary math.</li>
                <li>Use rounding intentionally—announce it, log it, and keep the extra dollars flowing to staff.</li>
                <li>Exports are leverage: they win disputes with finance teams and back up wage conversations.</li>
                <li>Sharing links keeps every diner accountable, especially across mixed cash/card groups.</li>
                <li>Aggregated data is power; review it weekly to tune staffing, pricing, and guest education.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-900 bg-slate-900 px-6 py-8 text-white">
            <p className="text-sm uppercase tracking-[0.5em] text-slate-400">Newsletter</p>
            <h3 className="mt-2 text-2xl font-semibold">Hospitality Cashflow</h3>
            <p className="mt-2 text-sm text-slate-200">
              Weekly intel on wages, RFPs, automation, and field-tested systems. Built on the same workflows powering this calculator.
            </p>
            <button className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900">
              Add me to the list
            </button>
            <p className="mt-3 text-xs text-slate-400">Subscribers tagged as TIP_CALC to receive per-market tipping signals.</p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">FAQs</h2>
            <details className="group border-b border-slate-100 py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700">
                What if my city already adds a service fee?
                <span className="text-slate-400 transition group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-sm text-slate-500">
                Enter it in the service/venue field so we don’t double-charge gratuity. Tip basis can stay pre-tax unless you’d like to reward above the service fee.
              </p>
            </details>
            <details className="group border-b border-slate-100 py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700">
                Can I store my receipts?
                <span className="text-slate-400 transition group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-sm text-slate-500">
                That’s the Tip Ledger beta — sign up above and we’ll migrate your session history once the vault opens.
              </p>
            </details>
            <details className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-700">
                Do you offer APIs?
                <span className="text-slate-400 transition group-open:rotate-90">›</span>
              </summary>
              <p className="mt-2 text-sm text-slate-500">
                Yes. A JSON endpoint is coming for POS providers and hospitality apps. Tap the “Add to list” button so we can flag you for early access.
              </p>
            </details>
          </div>
        </aside>
      </main>
    </div>
  );
}
