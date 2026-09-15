# 01: Domain Ingestion & Pre-Validation Heuristics Engine

**What to build:** Ingests and validates raw line-delimited JSON (.jsonl) field reports, computes exact duration arithmetic from arrival/departure timestamps, detects time discrepancies between stated hours and calculated timestamps, flags sparse/incomplete reports, detects technician IDs and PII, and formats standardized customer redaction disclosures.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Parses and validates raw field report JSONL records against the domain schema
- [x] Computes exact visit duration in hours from ISO 8601 timestamps (arrived_at and departed_at)
- [x] Flags a warning when stated duration differs from calculated duration by more than 0.1 hours (6 minutes)
- [x] Flags a quality warning when resolution and technician notes contain fewer than 5 words or lack substantive content
- [x] Formats standardized customer redaction disclosure stating technician IDs and internal diagnostic notes were removed
- [x] Full unit test suite covering timestamp arithmetic, discrepancy detection, sparse logs, and redaction disclosures
