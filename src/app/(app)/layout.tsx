import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const notifs = notifications ?? [];
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar username={profile?.username} notifications={notifs} unread={unread} />
      <main className="container flex-1 py-6 pb-24 md:py-8 md:pb-8">{children}</main>
      <MobileNav />
    </div>
  );
}
