import { spawn } from "child_process";
import path from "node:path";
import { persistPdf } from "@/lib/storage";

export type PdfPayload = {
  fileName: string;
  bill: string;
  taxPercent: string;
  servicePercent: string;
  tipPercent: string;
  tipBasisLabel: string;
  peopleCount: number;
  breakdown: { label: string; valueFormatted: string }[];
  perPersonFormatted: string;
  tipPerPersonFormatted: string;
  kitchenReserveFormatted: string;
  insights: { label: string; value: string; caption: string }[];
};

export async function renderPdf(payload: PdfPayload): Promise<string> {
  const scriptPath = path.join(process.cwd(), "scripts", "render_pdf.py");
  const jsonPayload = JSON.stringify(payload);

  const python = spawn(
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    [scriptPath, jsonPayload],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let output = "";
  let errorOutput = "";

  python.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });

  python.stderr.on("data", (chunk) => {
    errorOutput += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    python.on("close", async (code) => {
      if (code === 0) {
        const filePath = output.trim();
        const result = await persistPdf(filePath);
        if (result.url) {
          resolve(result.url);
        } else {
          resolve(filePath);
        }
      } else {
        reject(new Error(errorOutput || `PDF generator exited with code ${code}`));
      }
    });
  });
}
