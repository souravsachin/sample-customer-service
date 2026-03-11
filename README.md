# sample-customer-service

A sample business application demonstrating how to build services on the **Zorbit platform**.

This service implements customer CRUD operations and showcases all core Zorbit platform patterns. It is intended as a reference implementation for teams building new business applications.

## Zorbit Platform Patterns Demonstrated

### 1. JWT Authentication from Identity Service

All endpoints require a valid JWT issued by `zorbit-identity` (the platform's central authentication authority at `accounts.platform.com`). The service validates tokens using the shared `JWT_SECRET` but never issues tokens itself.

```
Authorization: Bearer <jwt-from-zorbit-identity>
```

See: `src/middleware/jwt.strategy.ts`, `src/middleware/jwt-auth.guard.ts`

### 2. PII Vault for Email/Phone Storage

Raw PII (email, phone) is **never stored** in the customer database. Instead:

1. On create/update, raw PII is sent to `zorbit-pii-vault` for tokenization
2. The vault returns a token (e.g. `PII-92AF`) which is stored in the DB
3. On read, PII is only detokenized if the caller has the `pii:detokenize` privilege

This ensures sensitive data lives only in the vault, not in operational databases.

See: `src/services/pii-vault.client.ts`, `src/services/customers.service.ts`

### 3. Kafka Event Publishing

All state-changing operations publish domain events following the Zorbit canonical envelope:

| Event                       | When Published    |
|-----------------------------|-------------------|
| customer.customer.created   | Customer created  |
| customer.customer.updated   | Customer updated  |
| customer.customer.deleted   | Customer deleted  |

Events are published to Kafka topics (dots replaced with dashes, e.g. `customer-customer-created`).

See: `src/events/event-publisher.service.ts`, `src/events/customer.events.ts`

### 4. Namespace Isolation

All endpoints are scoped to an organization namespace:

```
/api/v1/O/:orgId/customers
```

The `NamespaceGuard` validates that the `orgId` in the URL matches the `org` claim in the caller's JWT. A user in org `O-92AF` cannot access customers in org `O-XXXX`.

Database queries always include `organizationHashId` in the WHERE clause.

See: `src/middleware/namespace.guard.ts`

### 5. Short Hash Identifiers

Customers are identified by short hash IDs (e.g. `CUS-A1B2`) following the Zorbit `PREFIX-HASH` pattern. These IDs are:

- Immutable
- Non-sequential
- 4 uppercase hex characters

See: `src/services/hash-id.service.ts`

## API Endpoints

| Method | Path                                     | Description            |
|--------|------------------------------------------|------------------------|
| GET    | /api/v1/O/:orgId/customers               | List customers         |
| POST   | /api/v1/O/:orgId/customers               | Create a customer      |
| GET    | /api/v1/O/:orgId/customers/:customerId   | Get customer by ID     |
| PUT    | /api/v1/O/:orgId/customers/:customerId   | Update a customer      |
| DELETE | /api/v1/O/:orgId/customers/:customerId   | Delete a customer      |

### Example: Create a Customer

```bash
curl -X POST http://localhost:3010/api/v1/O/O-92AF/customers \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890"
  }'
```

Response:
```json
{
  "hashId": "CUS-A1B2",
  "displayName": "Jane Doe",
  "organizationHashId": "O-92AF",
  "status": "active",
  "createdAt": "2026-03-11T00:00:00.000Z",
  "updatedAt": "2026-03-11T00:00:00.000Z"
}
```

Note: `email` and `phone` are NOT returned unless the caller has the `pii:detokenize` privilege.

## Running Locally

### Prerequisites

- Node.js 20+
- Docker and Docker Compose

### Setup

```bash
npm install
cp .env.example .env
docker-compose up -d   # Starts PostgreSQL and Kafka
npm run start:dev
```

The service starts on port **3010**.

### Platform Dependencies

For full functionality, you also need:

| Service            | Default URL             | Purpose                |
|--------------------|-------------------------|------------------------|
| zorbit-identity    | http://localhost:3001    | JWT token issuance     |
| zorbit-pii-vault   | http://localhost:3005    | PII tokenization       |
| zorbit-authorization | http://localhost:3002  | Privilege checks       |

### Running Tests

```bash
npm test
npm run test:cov    # with coverage
```

## Project Structure

```
src/
  config/          - Database and Kafka configuration
  controllers/     - HTTP request handlers
  events/          - Event publisher and event type constants
  middleware/       - JWT guard, JWT strategy, namespace guard
  models/
    dto/           - Request/response DTOs
    entities/      - TypeORM database entities
  modules/         - NestJS module definitions
  services/        - Business logic, PII vault client, hash ID generator
tests/             - Unit tests
```
