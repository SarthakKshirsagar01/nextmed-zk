# Running NextMed with Docker Locally

## Prerequisites

1. **Docker Desktop installed** — [Download for Windows](https://www.docker.com/products/docker-desktop)
2. **Docker daemon running** — Start Docker Desktop app
3. Optional: `curl` command in terminal (for testing endpoints)

## Quick Start

### 1. Navigate to project root

```powershell
cd c:\Users\HP\Desktop\nextmed-zk
```

### 2. Validate Docker installation

```powershell
docker --version
docker-compose --version
```

Both should show version numbers (e.g., Docker 25.0.0, Docker Compose 2.x).

### 3. Start the stack

```powershell
docker-compose up --build
```

This will:

- Download PostgreSQL 16 Alpine image (~100MB)
- Build proof-server image from ./services/proof-server
- Start PostgreSQL ledger on port 5432
- Start proof server on port 9090
- Initialize database schema

First run takes ~2-3 minutes. Subsequent runs are faster (~30s).

### 4. Verify services are running

In a **new terminal**:

```powershell
# Check proof server health
curl http://localhost:9090/health

# Should return:
# {"status":"ok","timestamp":"2026-04-08T..."}
```

### 5. Run dev app in another terminal

```powershell
npm run dev
```

App on http://localhost:3000 can now call proof server backend.

## Stopping the stack

Press **Ctrl+C** in the docker-compose terminal, or:

```powershell
docker-compose down
```

To also remove data volumes:

```powershell
docker-compose down -v
```

## Proof Server API

While `docker-compose up` is running:

### Health Check

```powershell
curl http://localhost:9090/health
```

### Generate Proof

```powershell
curl -X POST http://localhost:9090/prove `
  -H "Content-Type: application/json" `
  -d '{
    "witnessHash": "witness123",
    "providerPubkey": "provider_key_456",
    "vaccineCodes": ["PFIZER_2X"]
  }'
```

Response:

```json
{
  "proof": "0x1234...",
  "commitmentHash": "0x5678...",
  "nullifier": "0xnulls_...",
  "isEligible": true
}
```

### Verify Proof

```powershell
curl -X POST http://localhost:9090/verify `
  -H "Content-Type: application/json" `
  -d '{
    "proof": "0x1234...",
    "nullifier": "0xnulls_...",
    "commitmentHash": "0x5678..."
  }'
```

Response:

```json
{
  "valid": true,
  "isEligible": true
}
```

## Midnight Bridge Mode

By default, docker-compose runs proof server in mock mode. To switch to a Midnight bridge backend, set these environment values for the `proof-server` service:

```yaml
environment:
  PROOF_BACKEND_MODE: midnight-http
  MIDNIGHT_BRIDGE_URL: https://your-midnight-bridge.example
  MIDNIGHT_BRIDGE_PROVE_PATH: /prove
  MIDNIGHT_BRIDGE_VERIFY_PATH: /verify
  MIDNIGHT_BRIDGE_API_KEY: your_api_key
  MIDNIGHT_BRIDGE_API_KEY_HEADER: Authorization
  MIDNIGHT_BRIDGE_API_KEY_PREFIX: Bearer
  MIDNIGHT_BRIDGE_REQUEST_WRAPPER: raw
  MIDNIGHT_BRIDGE_TIMEOUT_MS: 15000
```

If your bridge expects nested payloads, set `MIDNIGHT_BRIDGE_REQUEST_WRAPPER` to `data`, `input`, or `payload`.

The server also normalizes common bridge response wrappers (`data`, `result`) and field aliases.

## Troubleshooting

### Port already in use

If port 5432 or 9090 is busy:

```powershell
# Find what's using port 5432
netstat -ano | findstr ":5432"

# Kill process (replace PID with process ID)
taskkill /PID <PID> /F
```

Or change docker-compose ports:

```yaml
ports:
  - "5433:5432" # Change left number
  - "9091:9090" # Change left number
```

### Docker daemon not running

Start Docker Desktop from Windows Start menu or:

```powershell
# If using WSL2 backend:
wsl --shutdown
# Then restart Docker Desktop
```

### Build fails (missing node modules)

Rebuild without cache:

```powershell
docker-compose build --no-cache
```

### Docker Desktop WSL2 memory issue

Limit Docker resources in %USERPROFILE%\.wslconfig:

```ini
[wsl2]
memory=4GB
swap=2GB
```

Then restart WSL: `wsl --shutdown`

## Integration with Next.js App

The app can call the proof server:

```typescript
const response = await fetch("http://localhost:9090/prove", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    witnessHash: hash,
    providerPubkey: key,
    vaccineCodes: ["PFIZER_2X"],
  }),
});

const { proof, nullifier } = await response.json();
```

See `app/passport/page.tsx` or `app/verify/page.tsx` for example integration.

## What's in the Stack

### PostgreSQL (ledger)

Database for:

- **vaccination_nullifiers**: Replay prevention (each proof can only be used once)
- **vaccination_verifications**: Verification audit log
- **patient_attestations**: Issued vaccination records

### Proof Server (mock)

Node.js/Express server that:

- Accepts proof generation requests
- Returns mock proof artifacts (commitment, nullifier, proof bytes)
- Records nullifiers to prevent re-use
- Accepts verification requests
- Returns boolean eligibility result

This is a **mock** of the real Midnight prover. For production Midnight integration, replace with actual Midnight SDK calls.

## Timeline

- **Build time**: ~2-3 minutes (first run)
- **Startup time**: ~30s (healthy checks)
- **Proof generation**: ~0.5-2s (simulated)
- **Verification**: ~0.5-1.5s (simulated)

Ready for April 10 deadline demo!
