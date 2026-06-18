import Link from "next/link";
import { signout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { Notification } from "@/types/database";

const LINKS = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/matches", label: "Matchs" },
  { href: "/leagues", label: "Ligues" },
  { href: "/leaderboard", label: "Classement" },
  { href: "/profile", label: "Profil" },
];

export function Navbar({
  username,
  notifications = [],
  unread = 0,
}: {
  username?: string | null;
  notifications?: Notification[];
  unread?: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="text-xl">🐐</span>
          <span className="hidden sm:inline">Le Prono du GOAT</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell items={notifications} unread={unread} />
          {username && (
            <span className="hidden text-sm text-muted-foreground sm:inline">
              @{username}
            </span>
          )}
          <form action={signout}>
            <Button variant="outline" size="sm" type="submit">
              Déconnexion
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
