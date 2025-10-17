import { getDocumentById } from "@/lib/actions/documents";
import { createResource } from "@/lib/actions/resources";

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
    console.log(`[${new Date().toISOString()}] Embedding process started.`);
    const { documentId } = await req.json();
    if (!documentId) {
      console.error(`[${new Date().toISOString()}] Error: Missing documentId.`);
      return new Response(JSON.stringify({ error: "Missing documentId" }), { status: 400 });
    }
    console.log(`[${new Date().toISOString()}] Received documentId: ${documentId}`);

    console.log(`[${new Date().toISOString()}] Fetching document from DB...`);
    const doc = await getDocumentById(documentId);
    if (!doc) {
      console.error(`[${new Date().toISOString()}] Error: Document not found for id: ${documentId}`);
      return new Response(JSON.stringify({ error: "Document not found" }), { status: 404 });
    }
    console.log(`[${new Date().toISOString()}] Document found: ${doc.name}`);

    let content = "";
    console.log(`[${new Date().toISOString()}] Parsing content for mime type: ${doc.mimeType}`);
    if (doc.mimeType === "application/pdf" || doc.url.toLowerCase().endsWith(".pdf")) {
      // Use the new dedicated parsing API route
      const res = await fetch(new URL("/api/parse-pdf", req.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: doc.url }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "PDF parsing failed");
      }

      const data = await res.json();
      content = data.content || "";
    } else {
      console.log(`[${new Date().toISOString()}] Fetching file buffer from URL: ${doc.url}`);
      const buf = await fetchBuffer(doc.url);
      console.log(`[${new Date().toISOString()}] File buffer fetched. Size: ${buf.length} bytes.`);
      if (doc.mimeType === "application/json" || doc.url.toLowerCase().endsWith(".json")) {
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
    }
    console.log(`[${new Date().toISOString()}] Content parsing complete. Extracted length: ${content.length}`);

    content = content.trim();
    if (!content) {
      console.error(`[${new Date().toISOString()}] Error: No extractable content.`);
      return new Response(JSON.stringify({ error: "No extractable content" }), { status: 400 });
    }

    console.log(`[${new Date().toISOString()}] Parsed content:\n`, content);

    console.log(`[${new Date().toISOString()}] Starting resource creation (embedding)...`);
    const message = await createResource({ content, documentId });
    console.log(`[${new Date().toISOString()}] Resource creation (embedding) complete.`);

    console.log(`[${new Date().toISOString()}] Embedding process finished successfully.`);
    return new Response(JSON.stringify({ status: "embedded", message }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedding failed";
    console.error(`[${new Date().toISOString()}] Embedding failed: ${message}`);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

