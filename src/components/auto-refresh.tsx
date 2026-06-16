"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rafraîchit les données du serveur à intervalle régulier (sans rechargement
 * complet de la page). `router.refresh()` relance le rendu du composant serveur
 * → récupère les derniers scores/classements depuis Supabase. Rend `null`.
 */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
