import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, CalendarCheck, MapPin, MessageCircle, Phone } from "lucide-react";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { DemoBanner } from "@/components/ui/demo-banner";
import { buttonClass } from "@/components/ui/button";
import { FavoriteButton } from "@/components/content/favorite-button";
import { ViewTracker } from "@/components/content/view-tracker";
import { Gallery } from "@/components/content/gallery";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HOUSING_TYPES } from "@/lib/constants";
import { formatDate, formatGNF, whatsappLink } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("housing").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = await load((await params).id);
  return { title: h ? `${h.title} — ${h.district}` : "Logement" };
}

export default async function HousingDetailPage({ params }: Props) {
  const { id } = await params;
  const [home, profile] = await Promise.all([load(id), requireProfile()]);
  if (!home) notFound();
  const supabase = await createClient();
  const { data: fav } = await supabase.from("housing_favorites").select("housing_id").eq("housing_id", id).eq("user_id", profile.id).maybeSingle();
  const t = HOUSING_TYPES[home.type];
  const availableNow = home.is_available && (!home.available_from || new Date(home.available_from) <= new Date());

  return (
    <article className="mx-auto max-w-3xl animate-fade-up">
      <ViewTracker kind="housing" id={home.id} />
      <BackLink href="/logement" label="Logement" />
      <Gallery images={home.images} alt={home.title} />

      <div className="mt-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge>
              {t.emoji} {t.label}
            </Badge>
            {home.is_demo && <DemoBadge />}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{home.title}</h1>
          <p className="mt-1 text-2xl font-extrabold text-brand-700">
            {formatGNF(home.price_gnf)} <span className="text-base font-semibold text-muted">/ mois</span>
          </p>
        </div>
        <FavoriteButton kind="housing" id={home.id} initial={!!fav} className="shrink-0 ring-1 ring-line" />
      </div>

      {home.is_demo && (
        <div className="mt-4">
          <DemoBanner what="annonce" />
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
          <MapPin className="mx-auto size-5 text-brand-600" aria-hidden />
          <p className="mt-1 truncate font-semibold">{home.district}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
          <BedDouble className="mx-auto size-5 text-brand-600" aria-hidden />
          <p className="mt-1 font-semibold">
            {home.rooms} pièce{home.rooms > 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
          <CalendarCheck className="mx-auto size-5 text-brand-600" aria-hidden />
          <p className="mt-1 font-semibold">
            {!home.is_available ? "Loué" : availableNow ? "Disponible" : formatDate(home.available_from, { month: "short", year: undefined })}
          </p>
        </div>
      </div>

      <section className="mt-5 space-y-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div>
          <h2 className="font-bold">Description</h2>
          <p className="mt-1 leading-relaxed whitespace-pre-line text-ink/80">{home.description || "—"}</p>
        </div>
        {home.amenities.length > 0 && (
          <div>
            <h2 className="font-bold">Équipements</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {home.amenities.map((a) => (
                <li key={a} className="rounded-full bg-canvas px-3 py-1.5 text-sm font-semibold ring-1 ring-line">
                  ✓ {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-extrabold">Contact</h2>
        {home.is_demo || !home.contact_phone ? (
          <p className="mt-2 text-sm text-muted">
            {home.is_demo
              ? "Annonce de démonstration : aucun propriétaire réel à contacter."
              : "Les coordonnées ne sont pas encore renseignées. Contacte l'équipe Uny pour plus d'informations."}
          </p>
        ) : (
          <>
            {home.contact_name && <p className="mt-1 text-sm text-muted">{home.contact_name}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:${home.contact_phone}`} className={buttonClass("outline", "lg")}>
                <Phone className="size-5" /> Appeler
              </a>
              <a
                href={whatsappLink(home.contact_phone, `Bonjour, je vous contacte via Uny au sujet de « ${home.title} ».`)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("primary", "lg", "bg-[#1fa855] hover:bg-[#178a45]")}
              >
                <MessageCircle className="size-5" /> WhatsApp
              </a>
            </div>
            <p className="mt-3 text-xs text-muted">Conseil : visite toujours le logement avant de verser un acompte.</p>
          </>
        )}
      </section>
    </article>
  );
}
