import { getDocumentById } from "@/lib/actions/documents";
import { createResource } from "@/lib/actions/resources";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

async function fetchBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: Request) {
  try {
    const { documentId } = await req.json();
    if (!documentId) return new Response(JSON.stringify({ error: "Missing documentId" }), { status: 400 });

    const doc = await getDocumentById(documentId);
    if (!doc) return new Response(JSON.stringify({ error: "Document not found" }), { status: 404 });

    const buf = await fetchBuffer(doc.url);

    let content = "";
    if (doc.mimeType === "application/pdf" || doc.url.toLowerCase().endsWith(".pdf")) {
      const data = await pdfParse(buf);
      content = data.text || "";
    } else if (doc.mimeType === "application/json" || doc.url.toLowerCase().endsWith(".json")) {
      const text = buf.toString("utf-8");
      try {
        const obj = JSON.parse(text);
        content = typeof obj === "string" ? obj : JSON.stringify(obj);
      } catch {
        content = text;
      }
    } else {
      content = buf.toString("utf-8");
    }

    content = content.trim();
    if (!content) {
      return new Response(JSON.stringify({ error: "No extractable content" }), { status: 400 });
    }

    const message = await createResource({ content, documentId });

    return new Response(JSON.stringify({ status: "embedded", message }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedding failed";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

