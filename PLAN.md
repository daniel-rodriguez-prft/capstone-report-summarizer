# Architecture & Implementation Plan: Northgate FM Report Summarizer (SDD)

## 1. System Architecture & Overview

The Northgate FM Report Summarizer is a modular, decoupled CLI pipeline designed around human-in-the-loop review, strict tenant and PII boundaries, and robust pre-validation heuristics.

```
                     [ Raw Field Reports (.jsonl) ]
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  1. Ingestion & Pre-Validator │
                   │  - Schema validation (Zod)    │
                   │  - Deterministic Heuristics   │
                   │  - Redaction Detection        │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  2. Portkey LLM Summarizer    │
                   │  - System Prompt (Northgate)  │
                   │  - Structured 6-Part Output   │
                   │  - Mock Mode Fallback         │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  3. Markdown Draft Generator  │
                   │  - Writes drafts/summary.md   │
                   └───────────────┬───────────────┘
                                   │
                           [ Human Review Gate ]
                     (Reviewer inspects & tweaks .md)
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  4. Draft Markdown Parser     │
                   │  - Ingests approved .md       │
                   │  - Groups by Asset            │
                   │  - Sorts Chronologically      │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │  5. PDFKit Document Compiler  │
                   │  - Clean minimalist layout    │
                   │  - Metadata cards & warnings  │
                   │  - Paginated PDF generation   │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   [ Customer Summary PDF (.pdf) ]
```

---

## 2. Directory & Module Structure

```
/
├── CONTEXT.md                    # Ubiquitous domain glossary
├── SPEC.md                       # Product specification
├── PLAN.md                       # Architectural & Implementation Plan
├── docs/adr/                     # Architecture Decision Records
│   ├── 0001-strict-redaction-boundary.md
│   ├── 0002-two-step-cli-review-workflow.md
│   ├── 0003-consolidated-batch-document-output.md
│   ├── 0004-standardized-redaction-disclosure-and-quality-alerts.md
│   ├── 0005-unstyled-minimalist-pdf-formatting.md
│   └── 0006-portkey-gateway-integration.md
├── src/
│   ├── types.ts                  # Zod schemas & TypeScript domain interfaces
│   ├── heuristics.ts             # Deterministic quality checks, duration & redactions
│   ├── llm/
│   │   ├── client.ts             # Portkey-configured Anthropic/OpenAI SDK adapter
│   │   ├── prompt.ts             # Northgate FM customer-facing prompt template
│   │   └── mock.ts               # Offline deterministic summarizer for testing
│   ├── markdown/
│   │   ├── generator.ts          # ReportSummary[] -> Markdown draft string
│   │   └── parser.ts             # Markdown draft string -> ReportSummary[]
│   ├── pdf/
│   │   ├── document.ts           # PDFKit layout builder, typography & pagination
│   │   └── styles.ts             # Document styling constants (margins, fonts, spacing)
│   ├── pipeline.ts               # Core orchestrator functions (summarizeBatch, compilePdf)
│   └── cli.ts                    # Commander CLI entrypoint (commands: summarize, export-pdf)
├── tests/
│   ├── fixtures/
│   │   ├── valid-reports.jsonl   # Standard operational reports
│   │   ├── sparse-reports.jsonl  # Reports with missing/minimal descriptions
│   │   ├── mismatch-reports.jsonl# Reports with duration / timestamp discrepancies
│   │   └── sample-draft.md       # Pre-built markdown draft for parser testing
│   ├── heuristics.test.ts        # Unit tests for deterministic validation heuristics
│   ├── markdown.test.ts          # Unit tests for bidirectional markdown serialization
│   ├── llm.test.ts               # Tests for Portkey client and mock summarizer
│   ├── pdf.test.ts               # Tests for PDF generation and buffer validation
│   └── cli.test.ts               # End-to-end integration tests for CLI commands
├── package.json
└── tsconfig.json
```

---

## 3. Module Breakdown & Technical Contracts

### Module 1: `src/types.ts` & `src/heuristics.ts`
- **Responsibilities**:
  - Validates JSONL lines with Zod schema (`RawFieldReportSchema`).
  - Computes exact visit duration in hours from ISO 8601 strings (`arrived_at`, `departed_at`).
  - Evaluates time discrepancies between stated hours and calculated timestamps:
    - `|stated_duration_hours - calculated_hours| > 0.1` => Warning attached.
  - Flags sparse reports:
    - `resolution.trim().split(/\s+/).length < 5 && technician_notes.trim().split(/\s+/).length < 5` => Sparse warning attached.
  - Formats canonical redaction disclosure notice:
    `"Notice: Report <report_id> contained internal technician identifier (<technician_id>) and internal diagnostic notes; these have been omitted from this customer summary."`

### Module 2: `src/llm/` (Portkey Gateway Adapter)
- **Responsibilities**:
  - Connects to Portkey Gateway URL (`https://api.portkey.ai/v1`) using `@anthropic-ai/sdk` or `openai`.
  - Injects headers: `x-portkey-api-key`, `x-portkey-virtual-key`, and provider config.
  - Formulates structured prompts with explicit system rules:
    1. Northgate FM is the sole servicing entity.
    2. Zero technician names, employee IDs, or phone numbers in output.
    3. Plain English translation of technical faults.
    4. Structured 6-section JSON response format.
  - Fallback **Mock Mode**: When `--mock` is passed or API keys are absent, runs deterministic extraction without external network calls, ensuring fast, offline test execution.

### Module 3: `src/markdown/` (Bidirectional Review Draft)
- **Responsibilities**:
  - `generator.ts`: Converts structured `ReportSummary[]` into a clear, clean Markdown document with distinct sections and HTML comments for stable AST/regex parsing.
  - `parser.ts`: Ingests edited Markdown, parses headers, metadata, quality callouts, and section bodies back into `ReportSummary[]`. Enables human reviewers to freely correct text, amend parts lists, or refine recommendations in Markdown.

### Module 4: `src/pdf/` (PDFKit Consolidated Compiler)
- **Responsibilities**:
  - Groups `ReportSummary[]` by `asset` and sorts chronologically by `arrived_at`.
  - Renders a multi-page document:
    - **Header**: Northgate FM Executive Field Report Summary, Batch Date, Total Assets Serviced, Total Visits.
    - **Asset Group Banners**: Distinct grouping for each asset.
    - **Report Cards**: Boxed summary for each visit containing metadata (Report ID, Date, Time on Site), Quality/Discrepancy Alerts, Redaction Notice, and the 6 Core Summary Sections.
    - **Footer**: Dynamic page numbers (`Page X of Y`) and confidentiality notice.

### Module 5: `src/cli.ts` & `src/pipeline.ts`
- **Responsibilities**:
  - `northgate summarize <input.jsonl> [--out <draft.md>] [--mock] [--model <model>]`:
    1. Reads and validates `.jsonl`.
    2. Runs heuristics and flags discrepancies.
    3. Invokes LLM / mock summarizer per report.
    4. Serializes into Markdown draft file.
    5. Displays summary statistics in terminal.
  - `northgate export-pdf <draft.md> [--out <output.pdf>]`:
    1. Reads and parses reviewed Markdown draft.
    2. Compiles consolidated PDFKit document.
    3. Saves output PDF and reports success.

---

## 4. Key Design Decisions & Alternatives Rejected

### 1. Two-Step CLI Workflow vs. Interactive Web App
- **Selected**: Two-step CLI generating an editable Markdown draft.
- **Why**: Zero deployment overhead, no authentication requirements, works directly in any developer/reviewer text editor, keeps token costs strictly bounded.
- **Alternatives Rejected**:
  - *Full-Stack React/Next.js Web UI*: Rejected due to unnecessary state management complexity, database requirements, and hosting overhead for a POC.
  - *Fully Automated Pipeline (No Human Gate)*: Rejected because unvalidated technician logs contain technical inaccuracies and sensitive notes that require review before client distribution.

### 2. PDFKit vs. Headless Browser (Puppeteer/Playwright)
- **Selected**: PDFKit.
- **Why**: Fast, lightweight, pure JavaScript/TypeScript execution with zero native Chromium/browser binary dependencies. Produces clean, precise, unstyled multi-page documents.
- **Alternatives Rejected**:
  - *Puppeteer / Playwright HTML-to-PDF*: Heavyweight (~200MB+ Chromium binaries), slower startup, potential sandbox/CI permission issues.
  - *HTML/Markdown-only output*: Rejected because facility contacts require standard, shareable, immutable PDF documents.

### 3. Portkey Gateway Architecture
- **Selected**: SDK configured with Portkey Gateway endpoint (`https://api.portkey.ai/v1`) and headers.
- **Why**: Allows flexible model switching (Claude 3.5 Sonnet, Claude 3 Opus, GPT-4o) and key management directly inside Portkey dashboard without updating application code.
- **Alternatives Rejected**:
  - *Hardcoded direct provider client*: Less flexible for enterprise routing and rate-limiting.

### 4. Deterministic Pre-Validation + LLM Post-Synthesis
- **Selected**: Split validation (code handles durations, timestamps, and PII detection; LLM handles plain-language synthesis).
- **Why**: LLMs are notoriously unreliable at arithmetic (e.g. calculating exact hours between 08:15 and 10:45) and detecting subtle numerical variance. Code handles exact math and heuristic flags; LLM focuses purely on language rewriting.
- **Alternatives Rejected**:
  - *Pure LLM Validation*: High hallucination risk for duration calculations and parts cross-referencing.

---

## 5. Testing Strategy & Test Boundaries

| Test Suite | Scope & Boundary | Verification Focus |
| :--- | :--- | :--- |
| **Heuristics Tests** (`heuristics.test.ts`) | Domain logic unit tests | - Exact time calculation & variance thresholds\n- Sparse report detection (< 5 words)\n- Redaction disclosure text formatting |
| **LLM & Mock Tests** (`llm.test.ts`) | LLM client & Mock provider | - Mock summarizer extracts 6 sections correctly\n- System prompt enforces redaction of tech ID and name\n- Portkey headers format correctly |
| **Markdown Parser Tests** (`markdown.test.ts`) | Draft generation & round-trip parsing | - Serializes `ReportSummary[]` to Markdown\n- Parses edited Markdown back without data loss\n- Handles reviewer modifications to sections |
| **PDF Generation Tests** (`pdf.test.ts`) | PDF compilation | - Groups by asset & sorts chronologically\n- Emits valid, non-empty PDF binary buffer\n- Handles single-report and multi-report batches |
| **CLI End-to-End Tests** (`cli.test.ts`) | Full pipeline CLI commands | - Ingests fixture JSONL -> outputs Markdown\n- Compiles Markdown -> outputs customer PDF |

---

## 6. Step-by-Step Implementation Roadmap

1. **Step 1: Domain Models & Heuristics Engine**
   - Create `src/types.ts` (Zod schemas, types).
   - Create `src/heuristics.ts` (time calculations, discrepancy checks, sparse detection, redaction notices).
   - Write comprehensive unit tests in `tests/heuristics.test.ts`.

2. **Step 2: Portkey LLM Adapter & Mock Engine**
   - Create `src/llm/prompt.ts` (Northgate customer-facing prompt).
   - Create `src/llm/mock.ts` (Deterministic mock synthesizer for testing and offline use).
   - Create `src/llm/client.ts` (Portkey gateway client with Anthropic/OpenAI compatibility).
   - Write tests in `tests/llm.test.ts`.

3. **Step 3: Bidirectional Markdown Draft Serializer & Parser**
   - Create `src/markdown/generator.ts` (Produces clean, human-editable draft).
   - Create `src/markdown/parser.ts` (Parses edited Markdown back to structured model).
   - Write round-trip tests in `tests/markdown.test.ts`.

4. **Step 4: PDFKit Document Builder**
   - Create `src/pdf/styles.ts` (Typography, margins, colors, layout rules).
   - Create `src/pdf/document.ts` (Multi-page consolidated layout grouped by asset, sorted chronologically).
   - Write PDF tests in `tests/pdf.test.ts`.

5. **Step 5: Pipeline Orchestrator & CLI Interface**
   - Create `src/pipeline.ts` (Orchestrates `summarizeBatch` and `compilePdf`).
   - Create `src/cli.ts` (Commander CLI commands `summarize` and `export-pdf`).
   - Create sample test fixtures in `tests/fixtures/`.
   - Write end-to-end pipeline tests in `tests/cli.test.ts`.

6. **Step 6: Validation & Verification**
   - Run full Vitest test suite.
   - Run end-to-end CLI execution with sample JSONL input.
   - Inspect generated Markdown draft and compiled customer PDF.
