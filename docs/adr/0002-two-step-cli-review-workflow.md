# 2. Human-in-the-Loop Two-Step CLI Workflow

Date: 2026-09-10

## Status
Accepted

## Context
Field technician reports are unvalidated and may contain technical jargon, inaccuracies, or sensitive statements. Generating a direct customer deliverable without review risks disclosing errors or sensitive details. Additionally, keeping the review step lightweight and cost-effective is a priority.

## Decision
Adopt a two-step CLI workflow:
1. `summarize`: Ingest raw `.jsonl`, validate heuristics, call LLM to generate an editable Markdown draft (`drafts/summary-draft.md`).
2. Human Review: Reviewer inspects and amends the Markdown draft in their text editor.
3. `export-pdf`: Compiles the reviewed Markdown draft into the final customer PDF.

## Consequences
- Ensures a human review gate before customer publication.
- Markdown provides an easily editable, transparent, version-controllable draft format.
- Avoids the overhead and token costs of heavyweight web UIs.
