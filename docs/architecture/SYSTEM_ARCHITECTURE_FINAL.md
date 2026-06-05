# System Architecture Final

## Runtime Shape

MedExplain AI is a Node.js/Express application serving:

- Static frontend assets from `public/`
- REST API routes under `/api`
- Root health check at `/health`
- Socket.IO realtime server on the same HTTP server
- MySQL persistence through a pooled `mysql2/promise` adapter

## Startup Flow

```text
validate env
  -> connect to MySQL server with retry
  -> create database if missing
  -> run JavaScript migrations
  -> seed system data
  -> seed admin if missing
  -> seed demo data only when DEMO_MODE=true
  -> verify DB
  -> create Express app
  -> register Socket.IO
  -> start HTTP server
  -> log health status
```

## Key Directories

- `src/config/`: environment and startup validation
- `src/database/`: bootstrap, connection pool, migrations, seeds
- `src/repositories/`: persistence layer
- `src/services/`: application services and health checks
- `src/realtime/`: Socket.IO server integration
- `src/sockets/`: realtime hub and event routing
- `src/middlewares/`: auth, rate limits, CSRF, request IDs, uploads
- `src/utils/`: logging, errors, responses, UUIDv7
- `public/`: frontend assets
- `uploads/`: runtime upload storage

## Deployment Notes

The production backend can serve the frontend directly. The Docker compose frontend service exists for demonstration/static-hosting compatibility, while API and realtime traffic should point to the backend service.

