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
  const { locale, tr } = useLocale();
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
      <Card className="w-full border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{tr("Sign in", "تسجيل الدخول")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr(
              "Enter your credentials to access the system.",
              "أدخل بيانات الاعتماد للوصول إلى النظام.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{tr("Email", "البريد الإلكتروني")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{tr("Password", "كلمة المرور")}</Label>
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-xs text-indigo-200 hover:text-indigo-100"
                >
                  {tr("Forgot password?", "نسيت كلمة المرور؟")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-white/10 bg-slate-950/40 text-white"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-slate-900 hover:bg-slate-100"
            >
              {loading ? tr("Signing in…", "جارٍ تسجيل الدخول…") : tr("Sign in", "تسجيل الدخول")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
