# Sample Customer Service

A reference module — minimum viable Zorbit service. Demonstrates the canonical
patterns: REST grammar, JWT auth, namespace isolation, event publishing,
manifest v2 contract.

## What it does

Customer CRUD with PII tokenization through the platform's PII vault.

## What to copy from it

- main.ts / app.module.ts SDK wiring
- ZorbitAuthModule.forRoot pattern
- Privilege guard usage
- Event publisher pattern

This module is a teaching tool. Don't deploy it in production.
