import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient; prismaSchemaSig?: string };

const prismaSchemaSig =
  Prisma.dmmf.datamodel.models
    .find((m) => m.name === "Node")
    ?.fields.map((f) => f.name)
    .join("|") ?? "unknown";

export const prisma =
  (globalForPrisma.prisma && globalForPrisma.prismaSchemaSig === prismaSchemaSig
    ? globalForPrisma.prisma
    : undefined) ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaSig = prismaSchemaSig;
}
