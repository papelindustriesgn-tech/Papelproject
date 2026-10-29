import { Bell, Briefcase, Compass, CreditCard, Heart, Home, ShieldCheck, Sparkles, Tag, User, type LucideIcon } from "lucide-react";
import { OPPORTUNITIES_ENABLED } from "@/lib/features";

type NavItem = { href: string; label: string; icon: LucideIcon; section?: readonly string[] };

const DEALS_SECTION = ["/avantages"];
/** Jobs, logement et marketplace sont regroupés dans « Opportunités » (rubrique optionnelle). */
const OPPORTUNITIES_SECTION = ["/opportunites", "/jobs", "/logement", "/marketplace"];

/** Navigation centrée sur les offres (façon UNiDAYS) : découvrir, explorer, carte, favoris, profil. */
const OFFERS_MOBILE: NavItem[] = [
  { href: "/accueil", label: "Découvrir", icon: Sparkles },
  { href: "/avantages/explorer", label: "Explorer", icon: Compass, section: DEALS_SECTION },
  { href: "/carte", label: "Ma carte", icon: CreditCard },
  { href: "/favoris", label: "Favoris", icon: Heart },
  { href: "/profil", label: "Profil", icon: User },
];

const WITH_OPPORTUNITIES_MOBILE: NavItem[] = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/avantages", label: "Avantages", icon: Tag, section: DEALS_SECTION },
  { href: "/carte", label: "Ma carte", icon: CreditCard },
  { href: "/opportunites", label: "Opportunités", icon: Briefcase, section: OPPORTUNITIES_SECTION },
  { href: "/profil", label: "Profil", icon: User },
];

export const MOBILE_NAV: NavItem[] = OPPORTUNITIES_ENABLED ? WITH_OPPORTUNITIES_MOBILE : OFFERS_MOBILE;

export const DESKTOP_NAV: NavItem[] = OPPORTUNITIES_ENABLED
  ? [
      { href: "/accueil", label: "Accueil", icon: Home },
      { href: "/avantages", label: "Avantages", icon: Tag, section: DEALS_SECTION },
      { href: "/carte", label: "Ma carte", icon: CreditCard },
      { href: "/opportunites", label: "Opportunités", icon: Briefcase, section: OPPORTUNITIES_SECTION },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/favoris", label: "Mes favoris", icon: Heart },
      { href: "/profil", label: "Profil", icon: User },
    ]
  : [
      { href: "/accueil", label: "Découvrir", icon: Sparkles },
      { href: "/avantages/explorer", label: "Explorer", icon: Compass, section: DEALS_SECTION },
      { href: "/carte", label: "Ma carte", icon: CreditCard },
      { href: "/favoris", label: "Mes favoris", icon: Heart },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/profil", label: "Profil", icon: User },
    ];

export const ADMIN_LINK = { href: "/admin", label: "Administration", icon: ShieldCheck };

export function isActive(pathname: string, item: { href: string; section?: readonly string[] }) {
  const prefixes = item.section ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
