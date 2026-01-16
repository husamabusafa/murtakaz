import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type KpiData = {
  id: string;
  unit?: string;
  formula?: string;
  targetValue?: number;
  currentValue?: number;
  baselineValue?: number;
  [key: string]: any;
};

async function main() {
  const filePath = path.join(process.cwd(), "data", "kpis.json");
  const raw = await readFile(filePath, "utf8");
  const kpisFile = JSON.parse(raw) as { entityType: string; version: string; data: KpiData[] };

  console.log("🔧 Fixing KPI formulas...\n");

  let fixedCount = 0;

  for (const kpi of kpisFile.data) {
    if (!kpi.formula) continue;

    const formula = kpi.formula;
    const unit = kpi.unit?.toLowerCase() || "";
    let newFormula = formula;
    let changed = false;

    // Fix formulas that return percentages when unit is already "%"
    if (unit === "%" && formula.includes("* 100")) {
      // Remove * 100 from formula
      newFormula = formula.replace(/\s*\*\s*100\s*;?\s*$/, ";");
      changed = true;
      console.log(`✓ Fixed ${kpi.id}: ${kpi.nameEn}`);
      console.log(`  OLD: ${formula}`);
      console.log(`  NEW: ${newFormula}`);
    }

    if (changed) {
      kpi.formula = newFormula;
      fixedCount++;
    }
  }

  if (fixedCount > 0) {
    await writeFile(filePath, JSON.stringify(kpisFile, null, 2), "utf8");
    console.log(`\n✅ Fixed ${fixedCount} KPI formulas`);
  } else {
    console.log("\n✅ No formulas needed fixing");
  }
}

main()
  .catch((e) => {
    console.error("❌ Fix failed:", e);
    process.exit(1);
  });
