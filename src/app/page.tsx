import Link from "next/link";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: "🏆", title: "Ligues privées", desc: "Affronte tes potes avec un simple code d'invitation." },
  { icon: "🔒", title: "Pronos verrouillés", desc: "Saisie bloquée automatiquement au coup d'envoi. Zéro triche." },
  { icon: "⚡", title: "Scores live", desc: "Résultats et points mis à jour en temps réel via API-Football." },
  { icon: "🤖", title: "Profils IA", desc: "Claude analyse ton style : L'Optimiste, Le Réaliste, Le Flambeur…" },
  { icon: "🎖️", title: "Badges", desc: "Débloque des achievements et grimpe au classement." },
  { icon: "💬", title: "Bot Discord", desc: "Pronostique sans quitter ton serveur, classement en commandes slash." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span className="text-2xl">🐐</span>
          <span>Le Prono du GOAT</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Inscription</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Coupe du Monde 2026
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Le concours de pronos qui fait taire le Discord.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Fini le chaos sur Google Sheets. Crée ta ligue, pronostique chaque
            match, et grimpe au classement en temps réel.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Commencer gratuitement</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
        </section>

        <section className="container grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1 font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="container flex h-14 items-center justify-center text-sm text-muted-foreground">
          🐐 Le Prono du GOAT — Coupe du Monde 2026
        </div>
      </footer>
    </div>
  );
}
