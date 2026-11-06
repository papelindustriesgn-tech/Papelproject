"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { cn } from "@/lib/cn";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-square overflow-hidden rounded-card">
        <ImagePlaceholder label="Photographie du produit à venir" />
      </div>
    );
  }
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-card bg-sable shadow-card">
        <Image
          key={images[active]}
          src={images[active]}
          alt={`${name} — photo ${active + 1}`}
          fill
          priority
          sizes="(min-width: 1024px) 600px, 100vw"
          className="animate-rise object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-4 gap-3" aria-label="Photos du produit">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Afficher la photo ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-xl ring-2 transition",
                  i === active ? "ring-papel-600" : "opacity-75 ring-transparent hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
