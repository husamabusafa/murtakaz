"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "@/providers/locale-provider";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    await authClient.signIn.email({
      email,
      password,
      fetchOptions: {
        onError: (ctx) => {
          setError(ctx.error.message);
          setLoading(false);
        },
        onSuccess: async () => {
          // Fetch the session to check the role
          const { data } = await authClient.getSession();
          const user = data?.user as { role?: string } | undefined;
          
          if (user?.role === "SUPER_ADMIN") {
            router.replace(`/${locale}/super-admin`);
          } else {
            router.replace(`/${locale}/overview`);
          }
        },
      },
    });
  }

  return (
    <div className="mx-auto grid max-w-md place-items-center py-10">
      <Card className="w-full border-border bg-card/50 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{t("signIn")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("signInSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("password")}</Label>
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-xs text-indigo-200 hover:text-indigo-100"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-muted/30 text-foreground"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full variant="secondary""
            >
              {loading ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
