# 4. Standardized Redaction Disclosure and Quality Alerts

Date: 2026-09-10

## Status
Accepted

## Context
Customers should have visibility that complete internal logs and technician IDs were captured during the visit without exposing the sensitive information. Furthermore, sparse reports or data discrepancies (such as duration mismatches) must be transparently highlighted to both the reviewer and the customer.

## Decision
1. Standardize the customer-facing redaction disclosure:
   `"Notice: Report <report_id> contained internal technician identifier (<technician_id>) and internal diagnostic notes; these have been omitted from this customer summary."`
2. Include automated quality alert banners for:
   - Time discrepancy (stated duration vs. calculated arrival/departure duration).
   - Sparse report (minimal or incomplete field notes).
   - Parts discrepancy.

## Consequences
- use a language that facilities contact rather than an engineer would understand.
- Full transparency without PII leakage.
- Prevents customer confusion over missing details.
- Flags data quality issues early in the review lifecycle.
