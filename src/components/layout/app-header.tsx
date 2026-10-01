import Link from "next/link";
import { Bell, CreditCard, House } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";

export function AppHeader({
  unread,
  first,
  last,
  avatar,
}: {
  unread: number;
  first: string;
  last: string;
  avatar: string | null;
}) {
  const iconBtn =
    "relative flex size-10 items-center justify-center rounded-full bg-white text-ink shadow-[var(--shadow-card)] hover:text-brand-600";
  return (
    <header className="border-line/70 bg-canvas/90 sticky top-0 z-30 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link href="/accueil" className="mr-auto lg:hidden" aria-label="Accueil Uny">
          <Logo />
        </Link>
        <div className="hidden flex-1 lg:block" />
        <Link href="/logement" className={`${iconBtn} lg:hidden`} aria-label="Logement">
          <House className="size-5" aria-hidden />
        </Link>
        <Link href="/notifications" className={iconBtn} aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}>
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span className="bg-coral-500 absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-5 font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link
          href="/carte"
          className="bg-ink hover:bg-brand-800 flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-white shadow-[var(--shadow-float)]"
        >
          <CreditCard className="text-mango-400 size-4" aria-hidden />
          Ma carte
        </Link>
        <Link href="/profil" className="hidden lg:block" aria-label="Mon profil">
          <Avatar src={avatar} first={first} last={last} size={40} />
        </Link>
      </div>
    </header>
  );
}
