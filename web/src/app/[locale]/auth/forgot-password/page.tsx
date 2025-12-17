"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/providers/locale-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const { locale, tr } = useLocale();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto grid max-w-3xl place-items-center py-10">
      <Card className="w-full border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{tr("Password reset", "إعادة تعيين كلمة المرور")}</CardTitle>
          <CardDescription className="text-slate-200">
            {tr(
              "Prototype screen. In production, this is handled by your SSO provider or NextAuth flow.",
              "هذه شاشة تجريبية. في الإنتاج، تتم إدارة ذلك عبر مزود SSO أو تدفق NextAuth.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100">
              {tr(
                "If an account exists for",
                "إذا كان هناك حساب مرتبط بـ",
              )}{" "}
              <span className="font-semibold text-white">{email || tr("your email", "بريدك الإلكتروني")}</span>
              {tr(", a reset link would be sent.", " فسيتم إرسال رابط إعادة التعيين.")}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{tr("Email", "البريد الإلكتروني")}</p>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@company.com"
                  className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400"
                />
              </div>
              <Button
                onClick={() => setSubmitted(true)}
                className="bg-white text-slate-900 hover:bg-slate-100"
              >
                {tr("Send reset link", "إرسال رابط إعادة التعيين")}
              </Button>
            </>
          )}

          <Link href={`/${locale}/auth/login`} className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
            {tr("Back to sign in", "العودة لتسجيل الدخول")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
