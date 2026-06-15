import Link from "next/link";
import { signout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/matches", label: "Matchs" },
  { href: "/leagues", label: "Ligues" },
  { href: "/leaderboard", label: "Classement" },
  { href: "/profile", label: "Profil" },
];

export function Navbar({ username }: { username?: string | null }) {
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

        <div className="flex items-center gap-3">
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
