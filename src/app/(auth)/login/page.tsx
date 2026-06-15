import Link from "next/link";
import type { Metadata } from "next";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string; redirect?: string };
}) {
  return (
    <Card>
      <form action={login}>
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>Content de te revoir 🐐</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchParams.message && (
            <p className="rounded-md bg-primary/10 p-3 text-sm text-primary">
              {searchParams.message}
            </p>
          )}
          {searchParams.error && (
            <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {searchParams.error}
            </p>
          )}
          <input type="hidden" name="redirect" value={searchParams.redirect ?? "/dashboard"} />
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full">
            Se connecter
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Inscris-toi
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
