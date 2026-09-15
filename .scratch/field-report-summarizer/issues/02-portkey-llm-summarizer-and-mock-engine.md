# 02: Portkey LLM Summarization & Deterministic Mock Engine

**What to build:** Translates raw technician field reports into plain-language, customer-facing executive summaries across 6 structured sections using Portkey AI Gateway, strictly excluding technician IDs and employee names, with an offline deterministic mock generator for zero-token local testing.

**Blocked by:** 01: Domain Ingestion & Pre-Validation Heuristics Engine

**Status:** done

- [x] Portkey Gateway client adapter supporting Anthropic / OpenAI configurations with custom headers (x-portkey-api-key, x-portkey-virtual-key)
- [x] System prompt enforcing Northgate FM customer tone, plain English explanations, and zero technician PII
- [x] Extracts structured 6-section summary: Asset & Date, What was found, What was done, Parts fitted, Recommendations, Time on site
- [x] Transparently notes limited field details when sparse reports are encountered without hallucinating missing facts
- [x] Deterministic mock synthesizer for offline test execution and zero-token development
- [x] Unit tests verifying prompt output structure, redaction compliance, and mock mode reliability
