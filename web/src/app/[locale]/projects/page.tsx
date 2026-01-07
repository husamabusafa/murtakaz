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

      <Card className="border-border bg-card/50 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:briefcase" className="h-4 w-4 text-foreground" />
                {t("projectPortfolio")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">{t("projectPortfolioDesc")}</CardDescription>
            </div>
            <div className="w-full max-w-xs">
              <Input placeholder={t("searchDemoPlaceholder")} className="border-border bg-muted/30 text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-white/0">
                  <TableHead className="text-muted-foreground">{t("project")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("owner")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("status")}</TableHead>
                  <TableHead className="text-muted-foreground">{t("health")}</TableHead>
                  <TableHead className="text-right text-muted-foreground">{t("milestones")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="border-border hover:bg-card/50">
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/${locale}/projects/${project.id}`} className="hover:underline">
                        {isArabic ? project.titleAr ?? project.title : project.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">{project.tags?.join(" • ")}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{project.owner}</TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell>
                      <RagBadge health={project.health} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
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
