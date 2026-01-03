Building a Basic Strategic Performance Management System Like Spider Impact
This documentation provides a comprehensive, step-by-step guide to building a basic version of a strategic performance management system inspired by Spider Impact. The system will include core features such as scorecards (hierarchical structures for objectives and KPIs), KPIs (key performance indicators with scoring and thresholds), basic forms for data entry, and dashboards for visualization and oversight.
We'll use Python with the Dash framework (from Plotly) for the web application, as it allows for interactive dashboards, forms, and real-time updates without needing a full backend server like Flask for simplicity. Dash is lightweight, Python-native, and excels at data visualization—making it ideal for a prototype. For data storage, we'll use SQLite (via SQLAlchemy) to persist scorecards, KPIs, and data entries. This keeps it basic and self-contained.
The system will support:

Scorecards: Hierarchical trees with perspectives, objectives, and KPIs.
KPIs: Numeric or text-based metrics with targets, thresholds (e.g., green/yellow/red scoring), and roll-up aggregation.
Forms: Simple data entry for updating KPIs.
Dashboards: Visualizations like charts, tables, and strategy maps.
User Interaction: Role-based views (simplified for this basic version).

This is a prototype-level implementation—suitable for learning or small-scale use. For production, consider adding authentication, scalability (e.g., PostgreSQL), and more advanced features.


# Basic Schema for a Spider Impact-Like Strategic Performance Management System

This document describes the **pure schema** (database structure), **JSON formats**, **user input structures**, and **formulas** needed to build a basic system like Spider Impact.  
No code implementation is included — only conceptual models, data structures, and calculation logic.

### 1. Core Database Schema (Relational Tables)

| Table Name       | Fields / Columns                                                                 | Description / Notes |
|------------------|----------------------------------------------------------------------------------|---------------------|
| **scorecards**   | id (PK, int)<br>name (varchar)<br>description (text)<br>owner_user_id (int)<br>created_at (datetime) | Top-level scorecards (e.g., Corporate Strategy, Department X) |
| **perspectives** | id (PK, int)<br>scorecard_id (FK)<br>name (varchar)<br>weight (float, default 1.0)<br>order (int) | e.g., Financial, Customer, Internal Processes, Learning & Growth |
| **objectives**   | id (PK, int)<br>perspective_id (FK)<br>name (varchar)<br>description (text)<br>weight (float, default 1.0)<br>order (int) | Strategic objectives (e.g., "Grow Revenue by 15%") |
| **kpis**         | id (PK, int)<br>objective_id (FK)<br>name (varchar)<br>description (text)<br>unit (varchar, e.g., %, $, count)<br>target (float)<br>direction (enum: higher_better, lower_better)<br>threshold_green (float)<br>threshold_yellow (float)<br>aggregation_method (enum: sum, avg, last, count)<br>calculation_formula (text, optional) | Key Performance Indicators / Measures |
| **kpi_values**   | id (PK, int)<br>kpi_id (FK)<br>value (float or text)<br>period (date or varchar, e.g., "2025-Q4")<br>status (enum: draft, approved)<br>entered_by_user_id (int)<br>entered_at (datetime) | Historical and current values of KPIs |
| **initiatives**  | id (PK, int)<br>objective_id (FK, optional)<br>name (varchar)<br>description (text)<br>owner_user_id (int)<br>start_date (date)<br>due_date (date)<br>progress_percent (float)<br>budget (float)<br>spent (float) | Projects/initiatives linked to objectives |
| **datasets**     | id (PK, int)<br>name (varchar)<br>description (text)<br>owner_user_id (int) | Tables for unstructured or external data |
| **dataset_records** | id (PK, int)<br>dataset_id (FK)<br>data (jsonb)  | Actual records (flexible JSON structure) |
| **forms**        | id (PK, int)<br>name (varchar)<br>dataset_id (FK, optional)<br>fields (json)  | Custom form definitions |
| **users**        | id (PK, int)<br>username (varchar)<br>full_name (varchar)<br>email (varchar)<br>role (varchar) | Simplified user management |

### 2. JSON Structures

#### KPI Definition (example)
```json
{
  "id": 42,
  "name": "Customer Satisfaction Score",
  "description": "Average CSAT from post-service surveys",
  "unit": "%",
  "target": 90.0,
  "direction": "higher_better",
  "threshold_green": 90.0,
  "threshold_yellow": 75.0,
  "aggregation_method": "avg",
  "calculation_formula": "AVG(survey_responses.rating)",
  "owner": "john.doe@example.com"
}
```

#### KPI Value Entry (user input)
```json
{
  "kpi_id": 42,
  "period": "2025-Q4",
  "value": 87.5,
  "status": "draft",
  "entered_by": "jane.smith@example.com",
  "entered_at": "2025-12-23T14:30:00Z"
}
```

#### Form Definition (custom form for dataset)
```json
{
  "form_id": 5,
  "name": "Incident Report Form",
  "dataset_id": 3,
  "fields": [
    {
      "name": "incident_date",
      "type": "date",
      "label": "Date of Incident",
      "required": true
    },
    {
      "name": "description",
      "type": "textarea",
      "label": "Description",
      "required": true
    },
    {
      "name": "severity",
      "type": "select",
      "label": "Severity",
      "options": ["Low", "Medium", "High", "Critical"],
      "required": true
    },
    {
      "name": "reported_by",
      "type": "text",
      "label": "Reported By",
      "default": "current_user"
    }
  ],
  "conditional_logic": [
    {
      "if": {"field": "severity", "value": "Critical"},
      "then": {"show": ["root_cause_analysis"]}
    }
  ]
}
```

#### User Input for Form Submission
```json
{
  "form_id": 5,
  "data": {
    "incident_date": "2025-12-20",
    "description": "Server outage during peak hours",
    "severity": "Critical",
    "reported_by": "admin"
  }
}
```

### 3. Scoring Formulas

#### KPI Score Calculation (0–100 normalized)
```
score = 
  if direction == "higher_better":
    if value >= target:
      100
    elif value >= threshold_yellow:
      50 + 50 * (value - threshold_yellow) / (target - threshold_yellow)
    else:
      50 * value / threshold_yellow
  else:  // lower_better (e.g., defect rate)
    if value <= target:
      100
    elif value <= threshold_yellow:
      50 + 50 * (threshold_yellow - value) / (threshold_yellow - target)
    else:
      50 * (target / value)
```

#### Color Mapping
```text
Green  → score ≥ 90
Yellow → 50 ≤ score < 90
Red    → score < 50
```

#### Objective Score (weighted average of child KPIs)
```
objective_score = Σ (kpi_score × kpi_weight) / Σ kpi_weights
```

#### Perspective Score
```
perspective_score = Σ (objective_score × objective_weight) / Σ objective_weights
```

#### Overall Scorecard Score
```
scorecard_score = Σ (perspective_score × perspective_weight) / Σ perspective_weights
```

### 4. User Input Flows (Simplified)

1. **Update KPI Value**
   - User selects KPI
   - Enters: period, value, optional comment
   - Submits → saved as draft or auto-approved

2. **Create Custom Form**
   - Select dataset (or create new)
   - Add fields: name, type (text, number, date, select, checkbox), required, default, options
   - Optional: conditional logic (if-then rules)

3. **Submit Form**
   - User fills fields
   - Data validated
   - Stored as new dataset record
   - Can trigger KPI update if linked

4. **Define Calculated KPI**
   - User enters formula (simple expressions or references to other KPIs/datasets)
   - Example: `(revenue - cost) / revenue * 100` for margin %

### 5. Aggregation Methods (for roll-ups)
- **sum** – Total of child values
- **avg** – Arithmetic mean
- **last** – Most recent value
- **count** – Number of non-null values
- **min** / **max** – Extreme values
- **weighted_avg** – Using child weights

This schema and these formulas provide the foundation for a basic Spider Impact-like system. You can implement it in any database (PostgreSQL, MySQL, SQLite) and any frontend/backend framework.