# 03: Bidirectional Review Draft Serializer & Parser

**What to build:** Generates a human-readable, editable Markdown draft file from structured summaries and parses edited Markdown files back into typed domain models so human reviewer adjustments (text edits, added parts, modified recommendations) are preserved for final PDF compilation.

**Blocked by:** 01: Domain Ingestion & Pre-Validation Heuristics Engine, 02: Portkey LLM Summarization & Deterministic Mock Engine

**Status:** done

- [x] Serializes batch of summarized reports into a structured, editable Markdown draft with clear section headers
- [x] Includes metadata, redaction notices, quality warning banners, and 6 core summary sections per report
- [x] Bi-directional parser reads edited Markdown drafts back into structured ReportSummary objects
- [x] Robust error handling for reviewer edits with fallback tolerance for minor formatting variations
- [x] Unit tests verifying full round-trip serialization and deserialization of edited Markdown files
