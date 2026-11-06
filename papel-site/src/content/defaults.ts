/**
 * Contenu par défaut du site.
 * - Sert de contenu initial (repris à l'identique dans la migration « contenu initial »).
 * - Sert de repli tant que Supabase n'est pas configuré (préversion, tests).
 *
 * Règle éditoriale : aucune caractéristique technique, coordonnée ou affirmation
 * non vérifiée. Un champ inconnu reste vide (null / "") et s'affiche comme
 * « en cours de validation » ou n'est pas affiché.
 */
import type { CompanySettings, HomeSettings, NewsPost, Product, ProductRange } from "@/lib/types";

export const DEFAULT_COMPANY: CompanySettings = {
  brandName: "Papel Industries",
  legalName: "Société Papel Industrie",
  legalForm: "Société à responsabilité limitée (SARL)",
  signature: "Papel — L'hygiène au quotidien.",
  rccm: "GC.TCC.2024.B.08451",
  nif: "600460612",
  headOffice: "Simbaya Gare, Ratoma — Conakry",
  factoryName: "Site industriel de Coyah",
  factoryArea: "Toguiron Kondéyah",
  factoryCity: "Coyah",
  country: "République de Guinée",
  factoryLat: null,
  factoryLng: null,
  phone: "",
  whatsapp: "",
  email: "",
  facebookUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  openingHours: "",
};

export const DEFAULT_HOME: HomeSettings = {
  heroEyebrow: "Papel Doux · Mouchoirs",
  heroTitle: "Papel, l'hygiène au quotidien.",
  heroSubtitle: "Des produits pensés pour accompagner chaque instant de votre quotidien.",
  heroImage: "/images/papel-doux-lifestyle-main.jpg",
  heroImageMobile: "/images/papel-doux-table.jpg",
  heroImageAlt: "Paquets de mouchoirs Papel Doux posés sur une table",
  commitmentsTitle: "Ce qui guide chacun de nos produits",
  commitments: [
    {
      title: "Qualité au quotidien",
      text: "Des produits agréables au toucher, pratiques et fiables, pensés pour les gestes de tous les jours.",
    },
    {
      title: "Accessibilité",
      text: "Des formats adaptés aux besoins et aux budgets de chacun, pour les familles comme pour les professionnels.",
    },
    {
      title: "Confiance et régularité",
      text: "Une marque identifiable et un approvisionnement suivi, pour retrouver Papel là où vous en avez besoin.",
    },
  ],
  companyTitle: "Une industrie guinéenne de l'hygiène",
  companyText:
    "Papel Industries est une entreprise guinéenne de transformation du papier et de produits d'hygiène, implantée à Coyah. Notre ambition : construire une marque de référence, capable de proposer durablement des produits de qualité constante et accessibles, d'abord en Guinée puis en Afrique de l'Ouest.",
  closingTitle: "Construisons ensemble l'hygiène de demain.",
  closingText:
    "Distributeurs, commerçants, hôtels, restaurants ou entreprises : parlons de vos besoins et des conditions de distribution Papel.",
};

const RANGE_TISSUES_ID = "6a1f3e1e-0001-4c3a-9a10-000000000001";

export const DEFAULT_RANGES: ProductRange[] = [
  {
    id: RANGE_TISSUES_ID,
    slug: "mouchoirs",
    name: "Mouchoirs Papel Doux",
    tagline: "La douceur au quotidien, à la maison comme en déplacement.",
    description:
      "Papel Doux est la première gamme de Papel Industries : des mouchoirs en paquet souple, faciles à ranger et à emporter, reconnaissables à leur emballage aux motifs tropicaux.",
    image_url: "/images/papel-doux-pack.jpg",
    is_commercialized: true,
    status: "published",
    sort_order: 10,
  },
  {
    id: "6a1f3e1e-0001-4c3a-9a10-000000000002",
    slug: "papier-toilette",
    name: "Papier toilette",
    tagline: null,
    description: null,
    image_url: null,
    is_commercialized: false,
    status: "draft",
    sort_order: 20,
  },
  {
    id: "6a1f3e1e-0001-4c3a-9a10-000000000003",
    slug: "essuie-tout",
    name: "Essuie-tout",
    tagline: null,
    description: null,
    image_url: null,
    is_commercialized: false,
    status: "draft",
    sort_order: 30,
  },
  {
    id: "6a1f3e1e-0001-4c3a-9a10-000000000004",
    slug: "serviettes-papier",
    name: "Serviettes en papier",
    tagline: null,
    description: null,
    image_url: null,
    is_commercialized: false,
    status: "draft",
    sort_order: 40,
  },
  {
    id: "6a1f3e1e-0001-4c3a-9a10-000000000005",
    slug: "autres-produits-hygiene",
    name: "Autres produits d'hygiène",
    tagline: null,
    description: null,
    image_url: null,
    is_commercialized: false,
    status: "draft",
    sort_order: 50,
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "7b2e4f2f-0002-4d4b-8b20-000000000001",
    range_id: RANGE_TISSUES_ID,
    slug: "papel-doux-soft-pack",
    name: "Papel Doux — Soft Pack",
    short_description: "Mouchoirs en paquet souple, au format pratique pour la maison, le bureau et la voiture.",
    description:
      "Le paquet souple Papel Doux se range facilement et trouve sa place partout : sur la table du salon, dans un tiroir de bureau ou dans la boîte à gants.\n\nSon emballage aux motifs tropicaux, vert, rouge et jaune, le rend immédiatement reconnaissable en rayon. Un produit du quotidien, pensé pour toute la famille.",
    images: ["/images/papel-doux-pack.jpg", "/images/papel-doux-table.jpg", "/images/papel-doux-en-rayon.jpg"],
    format: "Paquet souple (soft pack)",
    dimensions: null,
    sheet_count: "300 feuilles",
    ply_count: null,
    packaging: null,
    recommended_uses: ["À la maison", "Au bureau", "En voiture", "Hôtels et restaurants"],
    technical_info: null,
    availability: "available",
    status: "published",
    is_featured: true,
    seo_title: "Mouchoirs Papel Doux Soft Pack",
    seo_description:
      "Mouchoirs Papel Doux en paquet souple : un format pratique pour la maison, le bureau et la voiture. Demandez un devis ou trouvez un distributeur.",
    sort_order: 10,
  },
  {
    id: "7b2e4f2f-0002-4d4b-8b20-000000000002",
    range_id: RANGE_TISSUES_ID,
    slug: "papel-doux-petit-format",
    name: "Papel Doux — Petit format",
    short_description: "Fiche à compléter : format de poche.",
    description: null,
    images: [],
    format: null,
    dimensions: null,
    sheet_count: null,
    ply_count: null,
    packaging: null,
    recommended_uses: [],
    technical_info: null,
    availability: "coming_soon",
    status: "draft",
    is_featured: false,
    seo_title: null,
    seo_description: null,
    sort_order: 20,
  },
];

export const DEFAULT_NEWS: NewsPost[] = [
  {
    id: "8c3f5a3a-0003-4e5c-9c30-000000000001",
    slug: "papel-doux-en-rayon",
    title: "Papel Doux arrive en rayon",
    excerpt: "Les mouchoirs Papel Doux sont désormais proposés en grande distribution.",
    content:
      "Les mouchoirs Papel Doux, première gamme de Papel Industries, sont désormais présents dans les rayons de la grande distribution.\n\n## Une marque pensée pour le quotidien\n\nAvec son emballage aux motifs tropicaux, Papel Doux se repère facilement en magasin. Le paquet souple s'adapte à tous les usages : maison, bureau, voiture.\n\n## Vous êtes commerçant ou distributeur ?\n\nPapel Industries développe son réseau de distribution. Contactez notre équipe commerciale depuis la page Professionnels pour connaître les conditions.",
    cover_image: "/images/papel-doux-en-rayon.jpg",
    category: "lancements",
    status: "published",
    published_at: "2026-11-05T09:00:00.000Z",
    seo_title: "Papel Doux arrive en rayon",
    seo_description: "Les mouchoirs Papel Doux sont désormais proposés en grande distribution.",
  },
];
