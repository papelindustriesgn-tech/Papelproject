"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, randomName } from "@/lib/image-client";

export type UploadedImage = { url: string; path: string | null };

export function ImageUploader({ userId, initial, max = 5 }: { userId: string; initial: UploadedImage[]; max?: number }) {
  const [images, setImages] = useState<UploadedImage[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const added: UploadedImage[] = [];
    try {
      for (const file of Array.from(files).slice(0, max - images.length)) {
        if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) {
          setError("Formats acceptés : JPG, PNG ou WebP.");
          continue;
        }
        const blob = await compressImage(file);
        if (blob.size > 3 * 1024 * 1024) {
          setError("Photo trop lourde (3 Mo max).");
          continue;
        }
        const path = `${userId}/${randomName(blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg")}`;
        const { error: upErr } = await supabase.storage.from("marketplace").upload(path, blob, {
          contentType: blob.type || "image/jpeg",
          cacheControl: "31536000",
        });
        if (upErr) {
          setError("Envoi de la photo impossible. Vérifie ta connexion.");
          continue;
        }
        const { data } = supabase.storage.from("marketplace").getPublicUrl(path);
        added.push({ url: data.publicUrl, path });
      }
      setImages((prev) => [...prev, ...added]);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {images.map((img, i) => (
          <div key={img.url} className="relative aspect-square overflow-hidden rounded-2xl bg-canvas ring-1 ring-line">
            <Image src={img.url} alt={`Photo ${i + 1}`} fill sizes="120px" className="object-cover" />
            {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">Couverture</span>}
            <button
              type="button"
              onClick={() => setImages((prev) => prev.filter((p) => p.url !== img.url))}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-white/95 text-ink shadow"
              aria-label={`Retirer la photo ${i + 1}`}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            {busy ? "Envoi…" : "Ajouter"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} data-testid="image-input" />
      <p className="mt-2 text-xs text-muted">
        {images.length}/{max} photos · Les photos sont compressées automatiquement pour économiser tes données.
      </p>
      {error && <p className="mt-1 text-sm text-coral-600">{error}</p>}
    </div>
  );
}
