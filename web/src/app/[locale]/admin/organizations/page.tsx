"use client";

import { useLocale } from "@/providers/locale-provider";
import { redirect } from "next/navigation";

export default function OrganizationsPage() {
  const { locale } = useLocale();

  redirect(`/${locale}/super-admin/organizations`);
}
