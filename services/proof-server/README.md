# Docker Proof Server Setup

This folder contains the mock Midnight proof service for local development.

## Building

```bash
docker build -t nextmed-proof-server:latest .
```

## Running Standalone

```bash
docker run -p 9090:9090 \
  -e DB_HOST=localhost \
  -e DB_PORT=5432 \
  -e DB_NAME=midnight_ledger \
  -e DB_USER=prover \
  -e DB_PASSWORD=prover_secret \
  nextmed-proof-server:latest
```

## Running with Docker Compose

From repository root:

```bash
docker-compose up
```

This will start:

- PostgreSQL ledger on port 5432
- Mock proof server on port 9090

## API Endpoints

### Health Check

```bash
curl http://localhost:9090/health
```

### Generate Proof

```bash
curl -X POST http://localhost:9090/prove \
  -H "Content-Type: application/json" \
  -d '{
    "witnessHash": "hash123",
    "providerPubkey": "pubkey456",
    "vaccineCodes": ["PFIZER_2X"]
  }'
```

### Verify Proof

```bash
curl -X POST http://localhost:9090/verify \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "0x...",
    "nullifier": "0xnulls_...",
    "commitmentHash": "0x..."
  }'
```
