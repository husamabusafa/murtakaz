# Migration Steps: Remove EntityValuePeriod and Simplify Value Storage

## Overview
Removed the `EntityValuePeriod` table and period-based unique constraints. Now each save creates a new `EntityValue` record, and the latest record (by `createdAt`) is always used.

## Database Changes

### 1. Run Prisma Migration
```bash
# Generate new Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name remove_period_constraints

# If migration fails, you may need to:
# 1. Drop entity_values table manually
# 2. Run: npx prisma migrate reset --skip-seed
# 3. Then seed: npm run seed
```

### 2. Seed Database (Fresh Start)
```bash
# This will create initial data with the new structure
npm run seed
# or
node prisma/seed-entity.ts
```

## Code Changes Summary

### Schema Changes (`prisma/schema.prisma`)
- **Renamed**: `EntityValuePeriod` → `EntityValue`
- **Removed fields**: `periodStart`, `periodEnd`
- **Removed constraint**: `@@unique([entityId, periodStart, periodEnd])`
- **Added index**: `@@index([entityId, createdAt])` for efficient latest-value queries

### Seed Files Updated
- `prisma/seed-entity.ts`: Changed `upsertEntityValuePeriodByVariableCodes` → `createEntityValueByVariableCodes`
- `prisma/seed-initiatives.ts`: Removed period range calculations
- All seeds now use `prisma.entityValue.create()` instead of upsert

### Backend Actions Updated (`web/src/actions/`)

#### `entities.ts`
- **Removed**: `resolvePeriodRange()` function
- **Updated**: All queries now use `orderBy: [{ createdAt: "desc" }]` to get latest
- **Changed**: `saveOrgEntityKpiValuesDraft` creates new records instead of upserting by period
- **Simplified**: `getOrgEntityDetail` no longer calculates current period
- **Simplified**: `cascadeRecalculateDependents` no longer matches periods

#### `dashboard.ts`  
- **Updated**: All value queries use `createdAt` instead of `periodEnd`
- **Changed**: Latest value structure uses `createdAt` field

## Frontend Updates Needed

### Pages to Update
The following files have lint errors and need updates:

1. **`web/src/app/[locale]/entities/[entityTypeCode]/[entityId]/page.tsx`**
   - Remove references to `data.currentPeriod` and `data.currentRange`
   - Use `data.latest` instead throughout
   - Update period display logic to use `latest.createdAt` instead of period dates

### API Response Changes
The `getOrgEntityDetail` function now returns:
```typescript
{
  entity: { /* ... */ },
  latest: { /* latest value or null */ },
  // REMOVED: currentRange, currentPeriod
  canAdmin: boolean,
  userAccess: { /* ... */ },
  // ...
}
```

## Key Behavioral Changes

### Before (Period-Based)
- Values were unique per entity+period combination
- Updating a value in a period would overwrite the previous value
- Had complex period matching logic
- Required period range calculations

### After (Latest-Based)
- Each save creates a new record
- Latest record (by `createdAt`) is always used
- Simple query: `ORDER BY createdAt DESC LIMIT 1`
- No period calculations needed

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Seed scripts create data correctly
- [ ] Entity value creation works
- [ ] Latest values are fetched correctly
- [ ] Dashboard displays values
- [ ] Entity detail pages load
- [ ] Cascade recalculation works
- [ ] Formula evaluation uses latest values
- [ ] Value history is preserved (multiple records per entity)

## Rollback Plan
If needed, you can rollback by:
1. Restore the previous schema from git
2. Run `npx prisma migrate reset`
3. Restore previous action files
4. Run seed again

## Notes
- Old `periodStart`/`periodEnd` logic completely removed
- All period matching and range calculation functions deleted
- The `periodType` field is still on Entity for display purposes but not used for querying
- Values are now simple: create a new record, latest wins
