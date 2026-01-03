"use client";

import { useLocale } from "@/providers/locale-provider";
import { redirect, useParams } from "next/navigation";

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const { locale } = useLocale();

  redirect(`/${locale}/super-admin/users/${params.userId}`);
}

