import { Bell, Briefcase, CreditCard, Heart, Home, ShieldCheck, Tag, User } from "lucide-react";

const DEALS_SECTION = ["/avantages"];
/** Jobs, logement et marketplace sont regroupés dans « Opportunités ». */
const OPPORTUNITIES_SECTION = ["/opportunites", "/jobs", "/logement", "/marketplace"];

export const MOBILE_NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/avantages", label: "Avantages", icon: Tag, section: DEALS_SECTION },
  { href: "/carte", label: "Ma carte", icon: CreditCard },
  { href: "/opportunites", label: "Opportunités", icon: Briefcase, section: OPPORTUNITIES_SECTION },
  { href: "/profil", label: "Profil", icon: User },
] as const;

export const DESKTOP_NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/avantages", label: "Avantages", icon: Tag, section: DEALS_SECTION },
  { href: "/carte", label: "Ma carte", icon: CreditCard },
  { href: "/opportunites", label: "Opportunités", icon: Briefcase, section: OPPORTUNITIES_SECTION },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/favoris", label: "Mes favoris", icon: Heart },
  { href: "/profil", label: "Profil", icon: User },
] as const;

export const ADMIN_LINK = { href: "/admin", label: "Administration", icon: ShieldCheck };

export function isActive(pathname: string, item: { href: string; section?: readonly string[] }) {
  const prefixes = item.section ?? [item.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
