# 6. Portkey Gateway Integration

Date: 2026-09-10

## Status
Accepted

## Context
The LLM summarization pipeline needs flexible model routing, observability, and central key management through the Portkey AI Gateway.

## Decision
Route model requests using standard Anthropic / OpenAI compatible SDK configurations with Portkey's gateway URL (`https://api.portkey.ai/v1`) and required Portkey headers (`x-portkey-api-key`, `x-portkey-virtual-key`). Provide environment variable configuration and fallback mock capabilities for local development and automated testing.

## Consequences
- Centralized model management and observability through Portkey.
- Allows changing target models within Portkey configs without codebase changes.
- Requires proper handling of Portkey headers and fallback mock options for local offline testing.
