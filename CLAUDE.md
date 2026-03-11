# Zorbit Service: sample-customer-service

## Purpose

This repository implements a **sample customer management service** that demonstrates how to build a business application on the Zorbit platform.

This is **NOT** a core platform service. It is a business application built **ON** the Zorbit platform, showcasing all platform patterns including JWT authentication, PII vault integration, event-driven communication, namespace isolation, and short hash identifiers.

## Responsibilities

- Customer CRUD operations within an organization namespace
- PII tokenization of customer email and phone via zorbit-pii-vault
- Publishing domain events to Kafka for downstream consumers
- Demonstrating namespace-isolated multi-tenancy
- Demonstrating short hash identifier pattern (CUS-XXXX)

## Architecture Context

This service follows Zorbit platform architecture.

Key rules:

- REST API grammar: /api/v1/O/:orgId/customers
- namespace-based multi-tenancy (Organization scope)
- short hash identifiers (CUS-XXXX)
- event-driven integration (customer.customer.created, etc.)
- service isolation
- PII vault integration — raw email/phone never stored in operational DB

## Dependencies

Allowed dependencies:

- zorbit-identity (JWT authentication)
- zorbit-authorization (privilege checks)
- zorbit-pii-vault (PII tokenization/detokenization)
- zorbit-messaging (Kafka event publishing)

Forbidden dependencies:

- direct database access to other services
- cross-service code imports

## Platform Dependencies

Upstream services:
- zorbit-identity (JWT validation)
- zorbit-authorization (privilege enforcement)
- zorbit-pii-vault (PII tokenization)
- zorbit-messaging (Kafka)

Downstream consumers:
- zorbit-audit (customer events)
- Any service subscribing to customer domain events

## Repository Structure

- /src/api — route definitions
- /src/controllers — request handlers
- /src/services — business logic (CustomersService, PiiVaultClient, HashIdService, EventPublisherService)
- /src/models/entities — TypeORM database entities
- /src/models/dto — request/response DTOs
- /src/events — event publisher and event type constants
- /src/middleware — JWT auth guard, JWT strategy, namespace guard
- /src/config — database and Kafka configuration
- /src/modules — NestJS module definitions
- /tests — unit tests

## Running Locally

```bash
npm install
cp .env.example .env
docker-compose up -d  # PostgreSQL + Kafka
npm run start:dev
```

Service runs on port 3010 by default.

## Events Published

- customer.customer.created
- customer.customer.updated
- customer.customer.deleted

## Events Consumed

None.

## API Endpoints

- GET    /api/v1/O/:orgId/customers           — List customers in organization
- POST   /api/v1/O/:orgId/customers           — Create a customer
- GET    /api/v1/O/:orgId/customers/:customerId — Get a customer by hashId
- PUT    /api/v1/O/:orgId/customers/:customerId — Update a customer
- DELETE /api/v1/O/:orgId/customers/:customerId — Delete a customer

All endpoints require JWT authentication and enforce organization namespace isolation.

## Development Guidelines

Follow Zorbit architecture rules.
