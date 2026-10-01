import Image from "@/components/ui/safe-image";

/** Galerie photo défilante (snap), légère : pas de JS. */
export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  if (!images.length) return <div className="bg-brand-50 aspect-[4/3] rounded-[var(--radius-card)]" />;
  return (
    <div className="-mx-4 md:mx-0">
      <div
        className="flex snap-x snap-mandatory scrollbar-none overflow-x-auto md:gap-3 md:rounded-[var(--radius-card)]"
        role="region"
        aria-label="Photos"
      >
        {images.map((src, i) => (
          <div
            key={src + i}
            className="bg-brand-50 relative aspect-[4/3] w-full shrink-0 snap-center md:w-[85%] md:overflow-hidden md:rounded-[var(--radius-card)]"
          >
            <Image
              src={src}
              alt={`${alt} — photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
            {images.length > 1 && (
              <span className="bg-ink/70 absolute right-3 bottom-3 rounded-full px-2.5 py-1 text-xs font-bold text-white">
                {i + 1}/{images.length}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
