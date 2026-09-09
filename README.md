# Render Event-Driven Demo

A minimal **event-driven system** you can deploy to [Render](https://render.com):

- **`web/`** – Next.js app. One button → creates an order via the API.
- **`api/`** – NestJS. Ships **three** runnable processes from one codebase:
  1. **HTTP API** – writes an `orders` row **and** an `outbox_events` row **in a single DB transaction** (transactional outbox pattern). It never talks to Redis directly.
  2. **Outbox relay** – polls the outbox table and publishes pending events to a **Redis** queue (BullMQ), then marks them published.
  3. **Consumer** – a BullMQ worker that consumes events and runs the task (updates the order). Deployed **twice** (`consumer-1`, `consumer-2`) so you can watch Redis distribute jobs across instances.

```mermaid
flowchart LR
    B[web: button] -->|POST /orders| API[api: NestJS HTTP]
    API -->|"TX: INSERT orders + INSERT outbox_events"| DB[(Postgres)]
    RELAY[outbox-relay worker] -->|"poll PENDING (FOR UPDATE SKIP LOCKED)"| DB
    RELAY -->|"queue.add()"| REDIS[(Redis / BullMQ)]
    REDIS --> C1[consumer-1]
    REDIS --> C2[consumer-2]
    C1 -->|"TX: mark processed + processed_events"| DB
    C2 -->|"TX: mark processed + processed_events"| DB
```

## The three requested concepts

| Concept | Where |
| --- | --- |
| **Transaction** | `api/src/orders/orders.service.ts` – order + outbox row committed atomically. `api/src/consumer/order-consumer.service.ts` – order update + idempotency row committed atomically. |
| **Outbox** | `outbox_events` table (`api/src/entities/outbox-event.entity.ts`). Written in the same TX as the business change; drained by `api/src/outbox/outbox-relay.service.ts`. |
| **Event** | `order.created` – payload defined in `api/src/events/order-events.ts`, carried through Redis to the consumers. |

Delivery is **at-least-once**: the relay publishes then marks the row `PUBLISHED`. If it crashes in between, the event is re-published. Consumers are **idempotent** via the `processed_events` table, so a duplicate delivery is a no-op.

---

## Run locally

Uses **pnpm** (`corepack enable` if you don't have it). Six terminals:

```bash
# 1. infra
docker compose up -d                       # Postgres + Redis

# 2. API (terminal 1) — the only process that creates the schema (DB_SYNC=true in .env)
cd api
cp .env.example .env
pnpm install
pnpm run dev:api                           # http://localhost:3001

# 3. Outbox relay (terminal 2)
cd api && DB_SYNC=false pnpm run dev:relay

# 4. Two consumers (terminals 3 & 4)
cd api && DB_SYNC=false RENDER_SERVICE_NAME=consumer-1 pnpm run dev:consumer
cd api && DB_SYNC=false RENDER_SERVICE_NAME=consumer-2 pnpm run dev:consumer

# 5. Web (terminal 5)
cd web
cp .env.example .env
pnpm install
pnpm run dev                               # http://localhost:3000
```

Open http://localhost:3000, click **Place order**, and watch:
- the API log commit the transaction,
- the relay log publish to Redis,
- one of the two consumers pick up the job (the table shows `processedBy: consumer-1` or `consumer-2`).

Schema is auto-created (`synchronize: true`) for demo simplicity — use migrations in production.

---

## Deploy to Render

This repo has a [`render.yaml`](./render.yaml) Blueprint. In the Render dashboard: **New → Blueprint**, point it at this repo, apply.

It provisions:

| Service | Type | Plan | Notes |
| --- | --- | --- | --- |
| `render-test-db` | Postgres | free | expires after 30 days on free |
| `render-test-kv` | Key Value (Redis) | free | `maxmemory-policy noeviction` (BullMQ requirement) |
| `api` | Web | free | public URL, `/health` healthcheck, `DB_SYNC=true` (creates the schema) |
| `web` | Web | free | `API_URL` wired to the `api` service host |
| `outbox-relay` | Worker | **starter** | Render has no free background workers |
| `consumer-1` | Worker | **starter** | |
| `consumer-2` | Worker | **starter** | distinct `RENDER_SERVICE_NAME` → visible in the orders table |

> **Cost note:** the 3 workers are `starter` (~$7/mo each) because Render does not offer free background workers. To stay fully free, change their `type` to `web` in `render.yaml` and give each a trivial port — but free web services sleep after 15 min of inactivity, which stalls the relay/consumers until the next request. Delete the Blueprint when you're done testing.

Once live, open the `web` service URL and click the button.
