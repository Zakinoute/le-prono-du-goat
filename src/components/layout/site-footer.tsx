import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="container flex h-14 items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        🐐 {APP_NAME} — Coupe du Monde 2026 · stats en lecture seule
      </div>
    </footer>
  );
}
