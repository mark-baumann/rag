
import { NextRequest, NextResponse } from "next/server";

// This is a workaround for the Vercel/Next.js bundling issue with pdf-parse
// It seems related to the canvas.node dependency and worker threads
// See: https://github.com/vercel/next.js/issues/48353
const pdf = require("pdf-parse");

async function fetchBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const buf = await fetchBuffer(url);
    const PDFParse = pdf.PDFParse;
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    const content = data.text || "";

    return NextResponse.json({ content: content.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF parsing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
