# 1. Strict Redaction Boundary (Northgate-as-the-Entity)

Date: 2026-09-10

## Status
Accepted

## Context
Raw field reports are logged on-site by field technicians and contain internal identifiers (e.g., `technician_id: "T-118"`), technician names, contact numbers, and internal diagnostic notes. The client facility contact contracts with Northgate FM as an organization, not with individual engineers.

## Decision
Strip all technician IDs, engineer names, phone numbers, addresses, and internal-only diagnostic notes from customer-facing summaries. The Asset reference is retained as the primary entity identifier.

## Consequences
- Protects employee PII and private internal operational notes.
- Enforces brand alignment under Northgate FM.
- Requires reliable redaction both in deterministic pre-processing and LLM prompt instructions.
