import type { Metadata } from "next";
import { Prose } from "@/components/landing/prose";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Règles de la marketplace" };

export default function MarketplaceRulesPage() {
  return (
    <Prose title="Règles de la marketplace Uny" updated="21 octobre 2026">
      <p>
        La marketplace permet aux étudiants et aux partenaires de vendre des biens et services physiques (livres, matériel,
        téléphones, vêtements…). Uny met en relation : le paiement et la remise de l&apos;article se font entre vous.
      </p>
      <h2>Interdit</h2>
      <ul>
        <li>Armes, drogues, médicaments, alcool, tabac, contrefaçons, objets volés, documents officiels.</li>
        <li>Contenus sexuels, haineux, violents ou harcelants ; données personnelles d&apos;autrui.</li>
        <li>Demande de paiement à l&apos;avance hors de toute rencontre, faux prix, annonces en double ou publicitaires.</li>
        <li>Vente de comptes, de cartes Uny ou de codes promo.</li>
      </ul>
      <h2>Bonnes pratiques</h2>
      <ul>
        <li>Photos réelles de l&apos;article, prix et état exacts.</li>
        <li>Rencontre dans un lieu public, vérifie l&apos;article avant de payer.</li>
      </ul>
      <h2>Signaler, bloquer</h2>
      <p>
        Sur chaque annonce : <strong>Signaler l&apos;annonce</strong> (motif et précisions) ou <strong>Bloquer le vendeur</strong>{" "}
        (vous ne voyez plus les annonces l&apos;un de l&apos;autre). À partir de 3 signalements de personnes différentes,
        l&apos;annonce est masquée jusqu&apos;à la décision de l&apos;équipe Uny. Un retrait est motivé et le vendeur est prévenu.
        En cas de récidive, le compte peut être suspendu.
      </p>
      <h2>Contact</h2>
      <p>
        Support :{" "}
        <a className="text-brand-600 font-semibold" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        . En cas de danger, contacte d&apos;abord les autorités.
      </p>
    </Prose>
  );
}
