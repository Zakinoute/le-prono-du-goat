"use server";

import { createClient } from "@/lib/supabase/server";

/** Marque toutes les notifications non lues de l'utilisateur comme lues. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
}
