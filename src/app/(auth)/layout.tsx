import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10">
      <Link href="/" className="flex items-center gap-2 text-lg font-bold">
        <span className="text-2xl">🐐</span>
        <span>Le Prono du GOAT</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
