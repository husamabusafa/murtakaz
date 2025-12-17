import { redirect } from "next/navigation";

export default async function LoginAlias({
  params,
}: Readonly<{
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  redirect(`/${locale}/auth/login`);
}

