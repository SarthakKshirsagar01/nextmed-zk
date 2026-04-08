# Docker Proof Server Setup

This folder contains the mock Midnight proof service for local development.

## Provider Modes

The proof server supports pluggable backend modes through environment variables.

- `PROOF_BACKEND_MODE=mock` (default): built-in simulated prover and verifier
- `PROOF_BACKEND_MODE=midnight-http`: forwards `/prove` and `/verify` to a Midnight bridge API

Environment variables for `midnight-http` mode:

- `MIDNIGHT_BRIDGE_URL` (default: `http://localhost:9091`)
- `MIDNIGHT_BRIDGE_PROVE_PATH` (default: `/prove`)
- `MIDNIGHT_BRIDGE_VERIFY_PATH` (default: `/verify`)
- `MIDNIGHT_BRIDGE_API_KEY` (optional bearer token)
- `MIDNIGHT_BRIDGE_API_KEY_HEADER` (default: `Authorization`)
- `MIDNIGHT_BRIDGE_API_KEY_PREFIX` (default: `Bearer`; use empty string for raw token)
- `MIDNIGHT_BRIDGE_REQUEST_WRAPPER` (default: `raw`; options: `raw`, `data`, `input`, `payload`)
- `MIDNIGHT_BRIDGE_TIMEOUT_MS` (default: `15000`)

Response normalization supported by provider:

- Prove response supports top-level, `data`, or `result` object wrappers
- Verify response supports top-level, `data`, or `result` object wrappers
- Field aliases accepted:
  - `proof`, `proofHex`, `proof_hex`
  - `commitmentHash`, `commitment`, `commitment_hash`
  - `nullifier`, `nullifierHash`, `nullifier_hash`
  - `valid`, `isValid`
  - `isEligible`, `eligible`

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
- Proof server on port 9090

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
