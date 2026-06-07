# Health Check Spec

## Endpoint

```http
GET /health
GET /api/health
```

## Healthy Response

```json
{
  "status": "healthy",
  "services": {
    "db": true,
    "ai": true,
    "realtime": true,
    "storage": true
  }
}
```

## Degraded Response

```json
{
  "status": "degraded",
  "services": {
    "db": false,
    "ai": true,
    "realtime": true,
    "storage": true
  }
}
```

## Checks

- `db`: runs a MySQL `select 1` through the configured pool.
- `ai`: true when `GEMINI_API_KEY` is configured.
- `realtime`: true after Socket.IO is registered.
- `storage`: creates/accesses the configured upload root.

## Status Codes

- `200`: all services are healthy.
- `503`: one or more services are degraded.
