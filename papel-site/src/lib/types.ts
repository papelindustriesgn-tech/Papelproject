export type PublicationStatus = "draft" | "published" | "archived";
export type Availability = "available" | "limited" | "coming_soon" | "unavailable";
export type LeadStatus = "nouveau" | "a_contacter" | "en_discussion" | "converti" | "cloture";
export type MessageStatus = "nouveau" | "traite" | "archive";

export type ProductRange = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  is_commercialized: boolean;
  status: PublicationStatus;
  sort_order: number;
};

export type Product = {
  id: string;
  range_id: string;
  slug: string;
  name: string;
  short_description: string | null;
  description: string | null;
  images: string[];
  format: string | null;
  dimensions: string | null;
  sheet_count: string | null;
  ply_count: string | null;
  packaging: string | null;
  recommended_uses: string[];
  technical_info: string | null;
  availability: Availability;
  status: PublicationStatus;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  updated_at?: string;
};

export type NewsCategory = "nouveautes" | "lancements" | "industrie" | "partenariats" | "evenements";

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  category: NewsCategory;
  status: PublicationStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at?: string;
};

export type CompanySettings = {
  brandName: string;
  legalName: string;
  legalForm: string;
  signature: string;
  rccm: string;
  nif: string;
  headOffice: string;
  factoryName: string;
  factoryArea: string;
  factoryCity: string;
  country: string;
  /** Coordonnées GPS confirmées de l'usine (carte affichée seulement si renseignées). */
  factoryLat: number | null;
  factoryLng: number | null;
  /** Numéros au format international, ex. +224 6XX XX XX XX. Vide = non affiché. */
  phone: string;
  whatsapp: string;
  email: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  openingHours: string;
};

export type Commitment = { title: string; text: string };

export type HomeSettings = {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  heroImageMobile: string;
  heroImageAlt: string;
  commitmentsTitle: string;
  commitments: Commitment[];
  companyTitle: string;
  companyText: string;
  closingTitle: string;
  closingText: string;
};

export type Lead = {
  id: string;
  full_name: string;
  company: string | null;
  city: string;
  whatsapp: string;
  email: string | null;
  activity_type: string;
  products_wanted: string[];
  estimated_volume: string | null;
  message: string | null;
  request_type: string;
  status: LeadStatus;
  internal_notes: string | null;
  source_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactMessage = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  created_at: string;
};
