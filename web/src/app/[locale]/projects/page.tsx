"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { RagBadge, StatusBadge } from "@/components/rag-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pillars } from "@/lib/mock-data";
import { useLocale } from "@/providers/locale-provider";

export default function ProjectsPage() {
  const { locale, t, isArabic } = useLocale();
  const projects = pillars.flatMap((pillar) => pillar.initiatives.flatMap((initiative) => initiative.projects));

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("projects")}
        subtitle={t("projectsSubtitle")}
        icon={<Icon name="tabler:timeline" className="h-5 w-5" />}
      />

      <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:briefcase" className="h-4 w-4 text-slate-100" />
                {t("projectPortfolio")}
              </CardTitle>
              <CardDescription className="text-slate-200">{t("projectPortfolioDesc")}</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <Input placeholder={t("searchDemoPlaceholder")} className="border-white/10 bg-slate-950/40 text-white placeholder:text-slate-400" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/0">
                  <TableHead className="text-slate-200">{t("project")}</TableHead>
                  <TableHead className="text-slate-200">{t("owner")}</TableHead>
                  <TableHead className="text-slate-200">{t("status")}</TableHead>
                  <TableHead className="text-slate-200">{t("health")}</TableHead>
                  <TableHead className="text-right text-slate-200">{t("milestones")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      <Link href={`/${locale}/projects/${project.id}`} className="hover:underline">
                        {isArabic ? project.titleAr ?? project.title : project.title}
                      </Link>
                      <p className="mt-1 text-xs text-slate-200">{project.tags?.join(" • ")}</p>
                    </TableCell>
                    <TableCell className="text-slate-200">{project.owner}</TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell>
                      <RagBadge health={project.health} />
                    </TableCell>
                    <TableCell className="text-right text-slate-200">
                      {project.milestonesComplete}/{project.milestonesTotal}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
