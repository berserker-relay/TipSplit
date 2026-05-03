import fs from "node:fs/promises";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type CaptureEntry = {
  email: string;
  billFormatted: string;
  tipPercent: number;
  perPersonFormatted: string;
  createdAt: string;
  source?: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const CAPTURE_PATH = path.join(DATA_DIR, "captures.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE ?? "captures";

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

async function readCapturesLocal(): Promise<CaptureEntry[]> {
  try {
    const content = await fs.readFile(CAPTURE_PATH, "utf-8");
    if (!content) return [];
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed as CaptureEntry[];
    return [];
  } catch {
    return [];
  }
}

async function writeCapturesLocal(entries: CaptureEntry[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CAPTURE_PATH, JSON.stringify(entries, null, 2));
}

export async function appendCapture(entry: CaptureEntry): Promise<CaptureEntry> {
  if (supabase) {
    const { error } = await supabase.from(SUPABASE_TABLE).insert(entry);
    if (error) {
      throw new Error(`Supabase insert failed: ${error.message}`);
    }
    return entry;
  }

  const captures = await readCapturesLocal();
  captures.push(entry);
  await writeCapturesLocal(captures);
  return entry;
}
