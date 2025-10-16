"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Doc = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

export default function DocumentManager({
  onSelect,
  selectedId,
  onAfterUpload,
}: {
  onSelect?: (id: string | undefined) => void;
  selectedId?: string;
  onAfterUpload?: () => void;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = (await res.json()) as { documents: Doc[] };
      setDocs(data.documents ?? []);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClickUpload = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Start: uploading
    const tId = toast.loading("Lade Dokument hoch...");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes = await fetch("/api/documents/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        let msg = "Upload fehlgeschlagen";
        try {
          const data = await uploadRes.json();
          if (typeof data?.error === "string" && data.error.length > 0) msg = data.error;
        } catch {}
        throw new Error(msg);
      }
      const { document } = await uploadRes.json();
      toast.success("Erfolgreich hochgeladen", { id: tId });

      // Next: embedding
      const t2 = toast.loading("Erstelle Embeddings...");
      const embedRes = await fetch("/api/documents/embed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });
      if (!embedRes.ok) throw new Error("Embedding fehlgeschlagen");
      toast.success("Embedding erstellt und gespeichert", { id: t2 });

      await refresh();
      onAfterUpload?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Fehler beim Upload";
      toast.error(msg);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600 dark:text-neutral-300">Dokumente</div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf,application/json,.json"
            className="hidden"
            onChange={onFileChange}
          />
          <Button disabled={loading} onClick={onClickUpload} variant="secondary">
            Upload
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {docs.map((d) => (
          <div
            key={d.id}
            role="button"
            onClick={() => onSelect?.(d.id)}
            className={`border rounded-md p-2 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
              selectedId === d.id ? "ring-2 ring-blue-500" : ""
            }`}
            title={d.name}
          >
            <FileThumb mimeType={d.mimeType} />
            <div className="text-xs truncate flex-1 text-neutral-700 dark:text-neutral-200">{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileThumb({ mimeType }: { mimeType: string }) {
  const isPdf = mimeType.includes("pdf");
  const isJson = mimeType.includes("json");
  const bg = isPdf ? "bg-red-500" : isJson ? "bg-green-500" : "bg-neutral-500";
  return <div className={`w-8 h-10 ${bg} text-white rounded-sm flex items-center justify-center text-[10px]`}>{isPdf ? "PDF" : isJson ? "JSON" : "FILE"}</div>;
}
