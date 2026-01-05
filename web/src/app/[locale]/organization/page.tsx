"use client";

import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function OrganizationPage() {
  const { tr } = useLocale();

  return (
    <div className="space-y-8">
      <PageHeader
        title={tr("Organization", "المؤسسة")}
        subtitle={tr("(Placeholder) Organization details will be shown here.", "(صفحة مؤقتة) سيتم عرض تفاصيل المؤسسة هنا.")}
        icon={<Icon name="tabler:building" className="h-5 w-5" />}
      />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr("Coming soon", "قريبًا")}</CardTitle>
          <CardDescription>{tr("We will build this page next.", "سنقوم ببناء هذه الصفحة لاحقًا.")}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
