"use client";

import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/providers/locale-provider";

export default function NodeTypePage() {
  const params = useParams<{ code: string }>();
  const { tr } = useLocale();

  const code = params?.code;

  return (
    <div className="space-y-8">
      <PageHeader
        title={code ? code.toUpperCase() : tr("Node Type", "نوع العقدة")}
        subtitle={tr("(Placeholder) This node type page will be built next.", "(صفحة مؤقتة) سيتم بناء صفحة نوع العقدة لاحقًا.")}
        icon={<Icon name="tabler:layers-subtract" className="h-5 w-5" />}
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
