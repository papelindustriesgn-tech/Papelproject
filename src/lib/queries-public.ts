import type { ItemCardData } from "@/components/content/cards";

type PublicItem = Omit<ItemCardData, "cover" | "verifiedSeller"> & { images: { url: string; position: number }[] | null };

export function toItemCard(i: PublicItem): ItemCardData {
  const cover = [...(i.images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null;
  const { images: _images, ...rest } = i;
  void _images;
  return { ...rest, cover };
}
