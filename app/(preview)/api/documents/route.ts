import { listDocuments } from "@/lib/actions/documents";

export const maxDuration = 30;

export async function GET() {
  const docs = await listDocuments();
  return new Response(JSON.stringify({ documents: docs }), {
    headers: { "content-type": "application/json" },
  });
}

