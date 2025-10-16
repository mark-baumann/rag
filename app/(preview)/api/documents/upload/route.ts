import { put } from "@vercel/blob";
import { env } from "@/lib/env.mjs";
import { createDocument } from "@/lib/actions/documents";
import { nanoid } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
    }

    const id = nanoid();
    const name = file.name ?? `document-${id}`;
    const mimeType = file.type || "application/octet-stream";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const size = buffer.byteLength;
    const ext = name.includes(".") ? name.split(".").pop() : undefined;
    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `documents/${id}-${safeName}`;

    const { url } = await put(key, buffer, {
      access: "public",
      token: env.BLOB_READ_WRITE_TOKEN,
      contentType: mimeType,
    });

    const doc = await createDocument({ id, name, url, mimeType, size });

    return new Response(JSON.stringify({ document: doc }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

