import { prisma } from "@/lib/prisma";

/**
 * Permission utility functions for entity access control
 * 
 * Access Rules:
 * 1. EDIT: User is directly assigned to the entity
 * 2. READ (Dependency): User is assigned to an entity that depends on this one (via formula)
 * 3. READ (Hierarchical): User's subordinate is assigned to this entity
 */

export type EntityAccess = {
  canRead: boolean;
  canEditValues: boolean; // Fill variables/values
  canEditDefinition: boolean; // Change formula, fields, structure (ADMIN only)
  reason: "assigned" | "dependency" | "hierarchical" | "admin" | "none";
};

/**
 * Extract entity keys referenced in a formula using get("KEY") syntax
 */
export function extractFormulaKeys(formula: string | null | undefined): string[] {
  if (!formula) return [];
  const regex = /get\s*\(\s*["']([^"']+)["']\s*\)/g;
  const keys: string[] = [];
  let match;
  while ((match = regex.exec(formula)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

/**
 * Get all subordinate user IDs for a given user (recursive)
 */
export async function getSubordinateIds(userId: string, orgId: string): Promise<string[]> {
  const subordinateIds = new Set<string>();
  const toProcess = [userId];
  const processed = new Set<string>();

  while (toProcess.length > 0) {
    const currentId = toProcess.pop()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    const directReports = await prisma.user.findMany({
      where: {
        orgId,
        managerId: currentId,
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const report of directReports) {
      subordinateIds.add(report.id);
      toProcess.push(report.id);
    }
  }

  return Array.from(subordinateIds);
}

/**
 * Check if user can edit entity values (directly assigned or hierarchical)
 */
export async function canEditEntityValues(userId: string, entityId: string, orgId: string): Promise<boolean> {
  // Direct assignment
  const assignment = await prisma.userEntityAssignment.findUnique({
    where: {
      user_entity_assignment_unique: {
        userId,
        entityId,
      },
    },
  });
  
  if (assignment) return true;
  
  // Hierarchical access
  const subordinateIds = await getSubordinateIds(userId, orgId);
  if (subordinateIds.length > 0) {
    const subordinateAssignment = await prisma.userEntityAssignment.findFirst({
      where: {
        entityId,
        userId: { in: subordinateIds },
      },
    });
    return !!subordinateAssignment;
  }
  
  return false;
}

/**
 * Get comprehensive entity access for a user
 */
export async function getEntityAccess(
  userId: string,
  entityId: string,
  orgId: string
): Promise<EntityAccess> {
  // Check direct assignment (EDIT access)
  const directAssignment = await prisma.userEntityAssignment.findUnique({
    where: {
      user_entity_assignment_unique: {
        userId,
        entityId,
      },
    },
  });

  if (directAssignment) {
    return { canRead: true, canEditValues: true, canEditDefinition: false, reason: "assigned" };
  }

  // Check dependency access (entities user is assigned to that depend on this one)
  const userAssignments = await prisma.userEntityAssignment.findMany({
    where: {
      userId,
    },
    include: {
      entity: {
        select: {
          id: true,
          formula: true,
        },
      },
    },
  });

  // Get the target entity's key
  const targetEntity = await prisma.entity.findUnique({
    where: { id: entityId },
    select: { key: true },
  });

  if (targetEntity?.key) {
    for (const assignment of userAssignments) {
      if (assignment.entity.formula) {
        const referencedKeys = extractFormulaKeys(assignment.entity.formula);
        if (referencedKeys.includes(targetEntity.key)) {
          return { canRead: true, canEditValues: false, canEditDefinition: false, reason: "dependency" };
        }
      }
    }
  }

  // Check hierarchical access (subordinates assigned to this entity)
  // Executives can edit VALUES of their subordinates' entities
  const subordinateIds = await getSubordinateIds(userId, orgId);

  if (subordinateIds.length > 0) {
    const subordinateAssignment = await prisma.userEntityAssignment.findFirst({
      where: {
        entityId,
        userId: { in: subordinateIds },
      },
    });

    if (subordinateAssignment) {
      return { canRead: true, canEditValues: true, canEditDefinition: false, reason: "hierarchical" };
    }

    // Check hierarchical dependency access (subordinates' entities depend on this one)
    // Managers can READ entities that their subordinates' entities depend on
    if (targetEntity?.key) {
      const subordinateAssignments = await prisma.userEntityAssignment.findMany({
        where: {
          userId: { in: subordinateIds },
        },
        include: {
          entity: {
            select: {
              id: true,
              formula: true,
            },
          },
        },
      });

      for (const assignment of subordinateAssignments) {
        if (assignment.entity.formula) {
          const referencedKeys = extractFormulaKeys(assignment.entity.formula);
          if (referencedKeys.includes(targetEntity.key)) {
            return { canRead: true, canEditValues: false, canEditDefinition: false, reason: "dependency" };
          }
        }
      }
    }
  }

  return { canRead: false, canEditValues: false, canEditDefinition: false, reason: "none" };
}

/**
 * Get all entity IDs a user can read (assigned + dependencies + hierarchical)
 */
export async function getUserReadableEntityIds(userId: string, orgId: string): Promise<string[]> {
  const entityIds = new Set<string>();

  // 1. Get directly assigned entities
  const directAssignments = await prisma.userEntityAssignment.findMany({
    where: { userId },
    select: { entityId: true, entity: { select: { formula: true } } },
  });

  const assignedEntityIds = directAssignments.map((a) => a.entityId);
  assignedEntityIds.forEach((id) => entityIds.add(id));

  // 2. Get dependencies (entities referenced in assigned entities' formulas)
  const referencedKeys = new Set<string>();
  for (const assignment of directAssignments) {
    if (assignment.entity.formula) {
      const keys = extractFormulaKeys(assignment.entity.formula);
      keys.forEach((key) => referencedKeys.add(key));
    }
  }

  if (referencedKeys.size > 0) {
    const dependencyEntities = await prisma.entity.findMany({
      where: {
        orgId,
        key: { in: Array.from(referencedKeys) },
        deletedAt: null,
      },
      select: { id: true },
    });
    dependencyEntities.forEach((e) => entityIds.add(e.id));
  }

  // 3. Get hierarchical access (entities assigned to subordinates)
  const subordinateIds = await getSubordinateIds(userId, orgId);
  if (subordinateIds.length > 0) {
    const subordinateAssignments = await prisma.userEntityAssignment.findMany({
      where: {
        userId: { in: subordinateIds },
      },
      select: { entityId: true, entity: { select: { formula: true } } },
    });
    subordinateAssignments.forEach((a) => entityIds.add(a.entityId));

    // 4. Get dependencies of hierarchical entities (entities referenced in subordinates' entities)
    const hierarchicalReferencedKeys = new Set<string>();
    for (const assignment of subordinateAssignments) {
      if (assignment.entity.formula) {
        const keys = extractFormulaKeys(assignment.entity.formula);
        keys.forEach((key) => hierarchicalReferencedKeys.add(key));
      }
    }

    if (hierarchicalReferencedKeys.size > 0) {
      const hierarchicalDependencies = await prisma.entity.findMany({
        where: {
          orgId,
          key: { in: Array.from(hierarchicalReferencedKeys) },
          deletedAt: null,
        },
        select: { id: true },
      });
      hierarchicalDependencies.forEach((e) => entityIds.add(e.id));
    }
  }

  return Array.from(entityIds);
}

/**
 * Get all entity IDs a user can edit (only directly assigned)
 */
export async function getUserEditableEntityIds(userId: string): Promise<string[]> {
  const assignments = await prisma.userEntityAssignment.findMany({
    where: { userId },
    select: { entityId: true },
  });
  return assignments.map((a) => a.entityId);
}

/**
 * Batch check entity access for multiple entities
 */
export async function batchGetEntityAccess(
  userId: string,
  entityIds: string[],
  orgId: string
): Promise<Map<string, EntityAccess>> {
  const accessMap = new Map<string, EntityAccess>();

  // Get all direct assignments in one query
  const directAssignments = await prisma.userEntityAssignment.findMany({
    where: {
      userId,
      entityId: { in: entityIds },
    },
    select: { entityId: true },
  });

  const directlyAssigned = new Set(directAssignments.map((a) => a.entityId));

  // Get user's assigned entities with formulas
  const userAssignments = await prisma.userEntityAssignment.findMany({
    where: { userId },
    include: {
      entity: {
        select: { id: true, formula: true },
      },
    },
  });

  // Get keys of target entities
  const targetEntities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, key: true },
  });

  const entityKeyMap = new Map(targetEntities.map((e) => [e.id, e.key]));

  // Build set of keys referenced in user's assigned entity formulas
  const referencedKeys = new Set<string>();
  for (const assignment of userAssignments) {
    if (assignment.entity.formula) {
      const keys = extractFormulaKeys(assignment.entity.formula);
      keys.forEach((key) => referencedKeys.add(key));
    }
  }

  // Get subordinate IDs
  const subordinateIds = await getSubordinateIds(userId, orgId);
  let subordinateAssignedIds = new Set<string>();

  if (subordinateIds.length > 0) {
    const subordinateAssignments = await prisma.userEntityAssignment.findMany({
      where: {
        userId: { in: subordinateIds },
        entityId: { in: entityIds },
      },
      select: { entityId: true },
    });
    subordinateAssignedIds = new Set(subordinateAssignments.map((a) => a.entityId));
  }

  // Determine access for each entity
  for (const entityId of entityIds) {
    if (directlyAssigned.has(entityId)) {
      accessMap.set(entityId, { canRead: true, canEditValues: true, canEditDefinition: false, reason: "assigned" });
    } else {
      const entityKey = entityKeyMap.get(entityId);
      if (entityKey && referencedKeys.has(entityKey)) {
        accessMap.set(entityId, { canRead: true, canEditValues: false, canEditDefinition: false, reason: "dependency" });
      } else if (subordinateAssignedIds.has(entityId)) {
        accessMap.set(entityId, { canRead: true, canEditValues: true, canEditDefinition: false, reason: "hierarchical" });
      } else {
        accessMap.set(entityId, { canRead: false, canEditValues: false, canEditDefinition: false, reason: "none" });
      }
    }
  }

  return accessMap;
}
