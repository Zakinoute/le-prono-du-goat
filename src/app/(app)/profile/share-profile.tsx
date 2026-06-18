"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Boutons de partage du profil public (`/u/<username>`) : copie du lien dans le
 * presse-papier + accès direct à la page publique.
 */
export function ShareProfile({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/u/${username}`;

  const copy = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}${path}`
          : path;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papier indisponible — l'utilisateur peut ouvrir le lien */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={copy}>
        {copied ? "Lien copié ✓" : "🔗 Partager"}
      </Button>
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Voir
      </a>
    </div>
  );
}
