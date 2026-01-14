---

# Concept Doc — Flat “Entity” System (Formula-only Connections, JS Function Formulas)

## 1) Core idea

Everything is an **Entity**. Entities are **flat**: the database stores **no explicit relationships** (no tree/graph edges, no parentId, no rollup tables).

Entities can represent labels like:

* PILLAR, OBJECTIVE, DEPARTMENT, INITIATIVE, PROJECT, TASK, KPI

…but those are **just UI labels**. The *only* way one entity depends on another is by referencing it inside its formula.

## 2) Entity types are just labels

`type` is used for grouping/filtering in the UI and permissions/presentation rules, but it has **no structural meaning** and does **not** imply hierarchy.

## 3) Values, periods, and approvals

Entities may be **time-series** or **non-time-series**:

### Time-series entities

* `periodType`: `MONTHLY | QUARTERLY | YEARLY`
* Have rows in `EntityValuePeriod` (one row per period)
* Approvals apply **per period** on `EntityValuePeriod`
* Each period row may include:

  * `actualValue` (user-entered numeric)
  * `calculatedValue` (computed intermediate)
  * `finalValue` (the value used by everything else; typically equals actual/calculated)
  * `approvalStatus` (e.g., DRAFT / SUBMITTED / APPROVED)

### Non-time-series entities

* `periodType = null`
* No `EntityValuePeriod` rows
* Store their single value in an entity-level value record (or a single “NULL period” row—implementation choice)
* If approvals are needed, apply them at the same “single value” level.

## 4) Formulas (v1 — JavaScript function body)

### 4.1 Syntax & runtime API

A formula is stored as a **JavaScript function body** (not an expression string). This makes formulas highly customizable while still being sandboxed.

Within the function body, the runtime provides:

* `vars.CODE` → local variable value for the current entity in the current period
* `get("KEY")` → referenced entity’s **approved finalValue** for the same period
* Optional helpers (recommended):

  * `num(x, defaultValue=0)` → safely coerce to number
  * `coalesce(a, b, ...)` → first non-null/undefined
  * `clamp(x, min, max)`
  * `round(x, decimals)`

**Contract:** formula must `return` a number (or `null` if you want “no value”).

#### Example: weighted CSAT

```js
// function body
return (get("sales_csat") * 0.4) + (get("support_csat") * 0.6);
```

#### Example: variables + referenced entities

```js
// vars.TARGET is a per-period variable on this entity
// get("REVENUE") pulls another entity's approved finalValue for this same period
const revenue = num(get("REVENUE"));
const target = num(vars.TARGET);
return target === 0 ? null : (revenue / target) * 100;
```

#### Example: safe handling of missing references

```js
// If a referenced entity has no approved value yet, get(...) may return null
const a = coalesce(get("a_key"), 0);
const b = coalesce(get("b_key"), 0);
return a + b;
```

### 4.2 How `get("KEY")` resolves (v1)

When evaluating an entity **for a specific period**:

1. Lookup referenced entity by `(orgId, key, deletedAt = null)`
2. Fetch its value for the **same period**
3. Return the **APPROVED `finalValue`** only (recommended v1)

   * If there is no approved value, return `null` (or throw—choose one rule and keep it consistent)

### 4.3 Variables

`vars` is a scoped object containing variable values for the **current entity and current period**.

* Variables are addressed as `vars.CODE`
* Variable codes should be validated (e.g., `^[A-Z0-9_]+$`) to keep parsing/evaluation safe and predictable

### 4.4 Dependency and cycle rule (must-have)

Even though relationships are not stored in the DB, circular dependencies must be rejected.

**On formula save:**

1. Parse the formula body and extract every `get("...")` key
2. Build an in-memory dependency graph from all entities’ formulas in the org
3. Reject the save if adding/updating this formula introduces a cycle

Block:

* Direct cycles: `A -> A`
* Indirect cycles: `A -> B -> C -> A`

### 4.5 Period compatibility (v1)

* A formula may only call `get("KEY")` for entities with the **same `periodType`** as the current entity.
* Later versions may support conversions (e.g., quarterly referencing monthly via aggregation), but **v1 rejects mismatches**.

## 5) Computation model

An entity’s `valueMode` determines how `finalValue` is produced:

* **MANUAL**

  * User enters `actualValue`
  * System sets `finalValue = actualValue`

* **CALCULATED**

  * User enters local variables for the period (`vars.*`)
  * System runs the entity’s formula using `vars.*` (and optionally `get()` if you allow mixing)
  * Sets `calculatedValue` and `finalValue = calculatedValue`

* **DERIVED**

  * System runs formula primarily using `get("KEY")` references
  * Sets `calculatedValue` and `finalValue = calculatedValue`

* **SCORE**

  * Same mechanics as DERIVED
  * Reserved for UI semantics (rollups, scorecards), not structural meaning

## 6) Implementation notes

### 6.1 Stable `key`

Because other entities reference `get("KEY")`, `key` must be:

* Unique per org
* Stable over time
* Soft-delete friendly

Recommendation:

* Enforce uniqueness on `(orgId, key)` for active entities
* On delete, keep the row but set `deletedAt`, and decide whether keys can be reused (I’d recommend **no reuse** to avoid formula ambiguity/history corruption)

### 6.2 Formula evaluation

When evaluating a formula for `(entityId, period)`:

* Provide a sandboxed runtime with only:

  * `vars`
  * `get`
  * approved helper functions
* Disallow access to global objects (`window`, `process`, `Function`, `eval`, imports, etc.)

**Caching (recommended):**

* Cache results of `get(key)` during a single evaluation pass to avoid repeated DB calls
* Optionally compute entities in topological order per period once cycles are rejected

### 6.3 Reject missing references (optional rule)

Choose one:

* **Strict**: formula save fails if it references unknown keys
* **Lenient**: allow save, but evaluation returns `null` for missing keys and surfaces warnings in UI

### 6.4 Cycle detection “without DB relations”

Even with “no relations stored”, you still must block cycles by analyzing formulas:

* Extract `get("...")` references
* Build the dependency graph in memory
* Reject cyclic updates

---

If you want, I can also add a small “Formula Parsing Spec” section that precisely defines what counts as a dependency (e.g., only literal-string `get("KEY")`, not `get(dynamicVar)`), which makes cycle detection reliable and keeps the sandbox simpler.
