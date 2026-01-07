"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export default function ContactPage() {
  const { locale, t } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("contactTitle")}
        subtitle={t("contactSubtitle")}
        icon={<Icon name="tabler:mail" className="h-5 w-5" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("contactForm")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("prototypeFormNoSubmission")} </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("name")}</p>
                <Input className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground" placeholder={t("fullName")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">{t("email")}</p>
                <Input className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground" placeholder="name@company.com" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("message")}</p>
              <Textarea className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground" placeholder={t("describeNeeds")} />
            </div>
            <Button className="variant="secondary"">
              <span className="inline-flex items-center gap-2">
                <Icon name="tabler:send" className="h-4 w-4" />
                {t("send")}
              </span>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("alternatives")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("quickDemoLinks")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <Link href={`/${locale}/dashboards/executive`} className="block rounded-xl border border-border bg-muted/30 px-4 py-3 hover:bg-card/50">
              <p className="font-semibold text-foreground">{t("executiveDashboard")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("quickPostureSnapshot")}</p>
            </Link>
            <Link href={`/${locale}/auth/login?next=/${locale}/overview`} className="block rounded-xl border border-border bg-muted/30 px-4 py-3 hover:bg-card/50">
              <p className="font-semibold text-foreground">{t("startTheDemo")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("signInWithDemoPersonas")}</p>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Link href={`/${locale}`} className="text-sm font-semibold text-indigo-200 hover:text-indigo-100">
        {t("backToHome")}
      </Link>
    </div>
  );
}
