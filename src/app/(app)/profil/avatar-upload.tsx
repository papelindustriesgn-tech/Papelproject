"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, randomName } from "@/lib/image-client";
import { setAvatar } from "./actions";

export function AvatarUpload({ userId, current, children }: { userId: string; current: string | null; children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compressImage(file, 512, 0.85);
      const supabase = createClient();
      const path = `${userId}/${randomName("jpg")}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await setAvatar(data.publicUrl);
      if (!res.ok) throw new Error();
      if (current) {
        const old = current.split("/avatars/")[1];
        if (old?.startsWith(`${userId}/`)) await supabase.storage.from("avatars").remove([old]);
      }
      router.refresh();
    } catch {
      setError("Impossible d'envoyer la photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={() => input.current?.click()} className="relative rounded-full" aria-label="Changer ma photo de profil">
        {children}
        <span className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-brand-600 text-white ring-4 ring-white">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="avatar-input" />
      {error && <p className="mt-2 text-sm text-coral-600">{error}</p>}
      {!current && !error && <p className="mt-2 text-xs text-muted">Ajoute une photo : elle apparaîtra sur ta carte.</p>}
    </div>
  );
}
