import { getDocumentById, listDocuments } from "@/lib/actions/documents";
import { NextRequest } from "next/server";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const doc = await getDocumentById(id);
    return new Response(JSON.stringify({ document: doc }), {
      headers: { "content-type": "application/json" },
    });
  }

  const docs = await listDocuments();
  return new Response(JSON.stringify({ documents: docs }), {
    headers: { "content-type": "application/json" },
  });
}

