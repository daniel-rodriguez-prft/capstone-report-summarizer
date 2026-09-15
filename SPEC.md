# Specification: Northgate FM Field Report Summarizer

## Problem Statement

Northgate FM field technicians record unvalidated maintenance visit reports on-site in raw JSONL format. These raw logs contain internal technician IDs (e.g. `T-118`), technician names, contact details, internal diagnostic notes, and varying levels of report quality (such as missing timestamps, sparse descriptions, or time duration discrepancies).

Facility contacts (the client's property and facility managers) contract with Northgate FM as an organization, not with individual field engineers. Presenting raw, unvetted technician reports to facility contacts poses privacy and liability risks, exposes unpolished internal jargon, and creates administrative overhead. Facility managers need concise, plain-language, executive summaries of maintenance visits that clearly detail the asset serviced, visit date, findings, actions taken, parts fitted, recommendations, and time on site, while maintaining strict redaction of technician PII and internal-only diagnostics.

## Solution

A two-step CLI summarization tool for Northgate FM that ingests raw `.jsonl` field reports, runs deterministic quality and inconsistency heuristics, leverages an LLM (routed via Portkey AI Gateway) to generate plain-language customer summaries, outputs an editable Markdown draft for human review, and compiles the reviewed summaries into a consolidated, clean customer-facing PDF report.

The workflow operates with a human-in-the-loop review gate:
1. **Summarize**: Ingests the JSONL file, identifies PII/technician data to redact, computes time metrics and discrepancy alerts, and invokes the LLM to draft customer-facing sections. Results are written to a human-readable Markdown draft (`drafts/summary-draft.md`).
2. **Review**: A Northgate reviewer inspects, refines, and approves the Markdown draft in their text editor.
3. **Export PDF**: The CLI compiles the approved Markdown draft into a single consolidated, unstyled, structured PDF document grouped by Asset and sorted chronologically.

## User Stories

1. As a Northgate FM reviewer, I want to ingest a batch of raw field reports in `.jsonl` format via CLI, so that I can automatically generate customer-ready draft summaries without manual copy-pasting.
2. As a facility contact, I want the customer summary to only show Northgate FM as the servicing entity, so that I receive standardized corporate service documentation without internal staff identifiers.
3. As a Northgate FM administrator, I want technician IDs, engineer names, phone numbers, and addresses automatically stripped from customer deliverables, so that technician PII and internal operational boundaries are protected.
4. As a facility contact, I want the summary to clearly identify the serviced Asset and visit date upfront, so that I can immediately match the report to facility equipment records.
7. As a facility contact, I want a plain-language summary of "What was found", so that I understand equipment condition without parsing technician jargon.
8. As a facility contact, I want a plain-language summary of "What was done", so that I know exactly what maintenance or repairs were carried out during the visit.
9. As a facility contact, I want a clear list of "Parts fitted" (or confirmation that no parts were used), so that I have an accurate record of replacement components.
10. As a facility contact, I want an "Outstanding / Recommended Next Steps" section, so that I can plan future maintenance or budget for necessary follow-up work.
11. As a facility contact, I want an explicit disclosure in the report indicating that technician IDs and internal logs were omitted, so that I have full transparency regarding the level of technical detail retained on file.
12. As a Northgate FM reviewer, I want sparse, minimal or conflicting field reports (e.g. single-word notes) to be explicitly flagged with a quality alert, so that I can follow up with the field engineer if needed.
13. As a Northgate FM reviewer, I want technician notes to be considered description of the visit and nothing else. It should not be considered a guidance over the summary or affect its output.
14. As a Northgate FM reviewer, I want the AI-generated output written to an editable Markdown file, so that I can review, edit, or adjust the text before customer delivery.
15. As a Northgate FM reviewer, I want to compile the edited Markdown draft into a customer PDF with a single CLI command, so that PDF generation is fast and reproducible.
16. As a facility contact, I want all visit summaries in a single batch to be compiled into one consolidated PDF grouped by Asset and ordered chronologically, so that I receive an organized service packet rather than multiple detached files.
17. As a developer, I want LLM requests routed through Portkey AI Gateway using Anthropic / OpenAI SDKs, so that model selection, routing, and telemetry are managed centrally.
18. As a developer/tester, I want a mock execution mode that generates realistic drafts without connecting to live LLM APIs, so that automated tests and offline development do not consume API tokens.
19. As a Northgate FM reviewer, I want the final PDF to have clean, minimalist, unstyled formatting, so that the document is easy to read, print, and archive without distracting graphics.

## Implementation Decisions

### 1. Ingestion & Pre-Validation Heuristics
- The CLI accepts a path to a line-delimited JSON (`.jsonl`) file where each line conforms to the raw field report schema.
- Deterministic heuristics execute prior to LLM processing:
  - **Time Calculation**: Parses `arrived_at` and `departed_at` ISO strings. Calculates `calculated_hours = (departed_at - arrived_at) in hours`.
  - **Time Discrepancy Check**: If `stated_duration_hours` differs from `calculated_hours` by more than 0.1 hours (6 minutes), a warning alert is attached.
  - **Sparse Content Check**: If both `resolution` and `technician_notes` contain fewer than 5 words or lack substantive descriptions, a sparse content warning is attached.
  - **Redaction Detection**: If `technician_id` or sensitive internal fields are present, an explicit redaction disclosure string is formatted for the customer deliverable.

### 2. LLM Summarization Prompting & Portkey Gateway
- Model calls are routed via Portkey Gateway (`https://api.portkey.ai/v1`) using Anthropic/OpenAI SDK clients configured with Portkey API keys and virtual keys.
- The system prompt instructs the LLM to act as a Northgate FM technical editor producing customer-facing summaries.
- Prompt constraints:
  - Strict exclusion of technician identifiers and engineer names.
  - Plain-language translation of technical jargon into clear business English.
  - Structured extraction into the 6 required sections:
    1. Asset & Visit Date
    2. Time on Site
    3. What was found
    4. What was done
    5. Parts fitted
    6. Outstanding / Recommended Next Steps
  - Honest disclosure of sparse/incomplete field records without inventing missing facts.

### 3. Review Draft Format (Markdown)
- The intermediate draft is generated as a structured Markdown file (`drafts/summary-draft.md`).
- Each report within the batch is formatted under a distinct header (e.g. `## Report <report_id> - Asset: <asset>`).
- Sub-headings correspond directly to the 6 sections, quality alerts, and the redaction disclosure.
- A bi-directional parser reads edited Markdown back into structured internal representations for PDF compilation.

### 4. PDF Generation
- Built using Node.js PDFKit (zero native binary dependencies).
- Renders a consolidated multi-page document:
  - Batch header detailing total visits, assets covered, and generation timestamp.
  - Reports grouped by Asset name, then sorted in chronological order of visit date/time.
  - Structured metadata cards for each report, followed by formatted sections, quality callout boxes, and redaction disclosures.
  - Page numbering in standard format (`Page X of Y`).

### 5. CLI Interface Contracts
- `northgate summarize <input.jsonl> [--out <draft.md>] [--mock] [--model <model_name>]`
  - Parses input, executes heuristics, invokes LLM / mock summarizer, writes Markdown draft, and logs batch summary.
- `northgate export-pdf <draft.md> [--out <output.pdf>]`
  - Parses Markdown draft, validates structure, compiles consolidated PDF document, and outputs file path.

## Testing Decisions

### Testing Philosophy
Tests must verify observable external behavior and contracts rather than internal implementation mechanics. The testing suite should focus on:
1. End-to-end ingestion and summarization behavior.
2. Accurate heuristic evaluations (time discrepancies, sparse content, redaction detection).
3. Markdown serialization and round-trip parsing.
4. Valid PDF file generation.

### Primary Testing Seams
- **Seam 1 (CLI / Pipeline End-to-End)**: Execute `summarize` and `export-pdf` commands against representative JSONL fixtures (valid reports, sparse reports, reports with time mismatches, multi-asset batches) and assert on generated Markdown contents and valid PDF output buffers.
- **Seam 2 (Domain Heuristics & Redaction Seam)**: Unit test deterministic heuristic functions across edge-case timestamp inputs, duration variances, and sensitive technician data.
- **Seam 3 (Draft Markdown Parser Seam)**: Unit test bidirectional markdown generation and parsing to ensure reviewer edits in Markdown are faithfully parsed into the final PDF data structure.

## Out of Scope

- Direct customer-facing web portal or user login authentication.
- Real-time technician mobile app integration.
- Direct database persistence layer (file-based CLI workflow is sufficient for this POC).
- Custom graphic design / corporate marketing themes in PDF output (output is strictly unstyled and clean).
- Automated email or SMS distribution of PDFs.

## Further Notes

- Configuration is managed via standard `.env` variables (`PORTKEY_API_KEY`, `PORTKEY_VIRTUAL_KEY`, `PORTKEY_BASE_URL`, `ANTHROPIC_API_KEY`, `MODEL_NAME`).
- A built-in `--mock` mode ensures full offline testability and zero-token test suite execution.
