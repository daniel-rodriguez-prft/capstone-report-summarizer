# 05: CLI Interface & End-to-End Pipeline Integration

**What to build:** Provides the complete CLI tool for Northgate FM reviewers, exposing the two-step workflow (summarize and export-pdf commands), supporting command-line flags (--out, --mock, --model), logging batch progress metrics, and integrating sample fixture test suites.

**Blocked by:** 01: Domain Ingestion & Pre-Validation Heuristics Engine, 02: Portkey LLM Summarization & Deterministic Mock Engine, 03: Bidirectional Review Draft Serializer & Parser, 04: Consolidated Minimalist PDF Document Compiler

**Status:** done

- [x] CLI command `northgate summarize <input.jsonl> [--out <draft.md>] [--mock] [--model <model>]` ingests JSONL and writes review draft
- [x] CLI command `northgate export-pdf <draft.md> [--out <output.pdf>]` parses edited draft and compiles customer PDF
- [x] Informative terminal output showing batch statistics, discrepancy warnings, and output file locations
- [x] Test fixtures representing valid reports, sparse reports, and duration mismatch edge cases
- [x] End-to-end integration tests verifying full execution of both CLI commands and output file integrity
