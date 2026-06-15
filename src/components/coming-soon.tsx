import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Placeholder pour les pages encore à construire. */
export function ComingSoon({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <span>🚧</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {subtitle ?? "Cette page sera bientôt disponible."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">← Retour au tableau de bord</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
