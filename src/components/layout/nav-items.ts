import { Bell, Briefcase, CreditCard, Heart, Home, House, ShieldCheck, ShoppingBag, Tag, User } from "lucide-react";

export const MOBILE_NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/avantages", label: "Avantages", icon: Tag },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/profil", label: "Profil", icon: User },
] as const;

export const DESKTOP_NAV = [
  { href: "/accueil", label: "Accueil", icon: Home },
  { href: "/carte", label: "Ma carte", icon: CreditCard },
  { href: "/avantages", label: "Avantages", icon: Tag },
  { href: "/jobs", label: "Jobs & opportunités", icon: Briefcase },
  { href: "/logement", label: "Logement", icon: House },
  { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { href: "/favoris", label: "Mes favoris", icon: Heart },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profil", label: "Profil", icon: User },
] as const;

export const ADMIN_LINK = { href: "/admin", label: "Administration", icon: ShieldCheck };
