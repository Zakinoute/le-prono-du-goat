"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Notification } from "@/types/database";
import { markAllNotificationsRead } from "./actions";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

/**
 * Cloche de notifications dans la navbar : compteur de non-lus + panneau
 * déroulant. « Tout marquer lu » appelle un server action puis rafraîchit le
 * layout (re-fetch des notifs).
 */
export function NotificationBell({
  items,
  unread,
}: {
  items: Notification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const markAll = () => {
    start(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop pour fermer au clic extérieur */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={pending}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-96 divide-y divide-border/40 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucune notification.
                </p>
              ) : (
                items.map((n) => {
                  const body = (
                    <div
                      className={cn(
                        "flex gap-2 px-3 py-2.5 transition-colors hover:bg-accent/40",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <span className="text-lg leading-none">{n.icon ?? "🔔"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {n.body && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="block"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id}>{body}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
