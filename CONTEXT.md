# Domain Glossary: Northgate FM Report Summarizer

## Entities & Actors
- **Northgate FM (Client / Entity)**: The facilities management service provider. All contracts and communications are with Northgate FM, not with individual field engineers.
- **Facility Contact (Customer / Reader)**: The client's facility/property contact receiving the maintenance service. The sole intended audience for the customer summary.
- **Field Technician / Engineer**: The on-site worker logging raw visit data. Internal technician identifiers (`technician_id`, names, phone numbers) and technician-only notes are strictly internal and must never appear in customer deliverables.
- **Asset**: The canonical piece of equipment serviced (e.g., `Chiller CH-04`, `AHU-02`). Retained as the sole entity identifier in the customer report.

## Core Concepts & Data Structures
- **Raw Field Report (`JSONL`)**: Line-delimited JSON records created on site, containing:
  - `report_id`: Unique report identifier (e.g., `FSR-3001`).
  - `asset`: Equipment identifier/name.
  - `technician_id`: Internal worker ID (to be redacted).
  - `arrived_at`: ISO timestamp of technician arrival.
  - `departed_at`: ISO timestamp of technician departure.
  - `stated_duration_hours`: Duration recorded by the technician.
  - `parts_used`: Array of parts/materials fitted.
  - `resolution`: Work outcome and repairs performed.
  - `technician_notes`: Internal observations, diagnostics, or notes.
- **Quality & Inconsistency Heuristics**: Automated pre-validation rules:
  - *Time Variance*: Discrepancy between calculated `(departed_at - arrived_at)` and `stated_duration_hours`.
  - *Sparse Record*: Content with insufficient field details to construct a full summary.
  - *Parts Inconsistency*: Parts referenced in text but missing from `parts_used` (or vice versa).
- **Redaction Disclosure**: A mandatory customer-facing notice explicitly disclosing what sensitive data types (technician IDs, personal details, internal logs) were detected and omitted from the customer summary.
- **Review Draft (`.md`)**: An intermediate human-editable Markdown file generated from the raw reports and LLM summarization for internal Northgate review prior to PDF compilation.
- **Customer PDF Summary**: A clean, unstyled, formatted consolidated document compiling all reviewed visit summaries, grouped by asset and sorted chronologically.
