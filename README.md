# Northgate FM Field Report Summarizer

A CLI tool that transforms raw field technician reports into polished, customer-ready summaries. Built for Northgate FM to streamline the delivery of maintenance visit documentation to facility contacts.

## Overview

Field technicians log maintenance visits as raw JSONL records containing internal IDs, timestamps, and technical notes. This tool:

1. **Ingests** raw `.jsonl` field reports
2. **Validates** data quality (time discrepancies, sparse content)
3. **Redacts** technician PII and internal identifiers
4. **Summarizes** visits using an LLM (via Portkey AI Gateway)
5. **Outputs** an editable Markdown draft for human review
6. **Exports** approved drafts to a consolidated customer-facing PDF

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file (see `.env.example`):

```env
PORTKEY_API_KEY=your_portkey_api_key
PORTKEY_VIRTUAL_KEY=your_virtual_key
PORTKEY_BASE_URL=https://api.portkey.ai
MODEL_NAME=claude-3-5-sonnet-latest
```

## Usage

### Step 1: Summarize Field Reports

```bash
npm run summarize -- <input.jsonl> [--out <draft.md>] [--mock] [--model <model_name>]
```

Or

```bash
npx northgate summarize -- <input.jsonl> [--out <draft.md>] [--mock] [--model <model_name>]
```

- `<input.jsonl>` — Path to raw JSONL field report file
- `--out` — Target path for Markdown draft (default: `drafts/summary-draft.md`)
- `--mock` — Run in offline mock mode (no LLM API calls)
- `--model` — Specify LLM model name

### Step 2: Review the Draft

Open the generated Markdown draft in your editor, review and refine the summaries.

### Step 3: Export to PDF

```bash
npm run export-pdf -- <draft.md> [--out <output.pdf>]
```
Or

```bash
npx northgate export-pdf -- <draft.md> [--out <output.pdf>]
```

- `<draft.md>` — Path to reviewed Markdown draft
- `--out` — Target path for customer PDF (default: `output/customer-summary.pdf`)

- `<draft.md>` — Path to reviewed Markdown draft
- `--out` — Target path for customer PDF (default: `output/customer-summary.pdf`)

## Testing

```bash
npm test           # Run tests once
npm run test:watch # Watch mode
```

## Project Structure

```
src/
├── cli.ts         # CLI entry point (Commander.js)
├── pipeline.ts    # Orchestrates summarize & export workflows
├── heuristics.ts  # Quality checks (time variance, sparse content)
├── types.ts       # TypeScript type definitions
├── llm/           # LLM integration via Portkey
├── markdown/      # Markdown generation & parsing
├── pdf/           # PDFKit-based PDF generation
└── tools/         # Utility functions
```

## License

ISC
