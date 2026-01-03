import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect(`/${locale}/auth/login`);
  }

  if (session.user.role === "SUPER_ADMIN") {
    redirect(`/${locale}/super-admin`);
  }

  if (session.user.role !== "ADMIN") {
    redirect(`/${locale}/overview`);
  }

  return <>{children}</>;
}
