# 3. Consolidated Batch Document Output

Date: 2026-09-10

## Status
Accepted

## Context
A single `.jsonl` input file contains multiple visit reports for a given facility over a service period. Facility contacts need a single consolidated document rather than dozens of detached PDF files.

## Decision
Generate a single consolidated PDF document summarizing all reports within the batch. Reports are grouped by Asset and sorted chronologically by visit timestamp (`arrived_at`).

## Consequences
- Produce a summary for every report, containing what the requirements ask for.
- Provides a clean, cohesive summary document for facility contacts.
- Reduces document management friction.
- Requires the PDF generator to cleanly format multi-report batches with appropriate page breaks or card separations.
