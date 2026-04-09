# NextMed ZK Health

NextMed is a Midnight-based demo app that proves a simple claim:

"This patient has a valid vaccination record signed by an approved clinic."

The verifier only sees a yes or no result. Personal health details stay private.

## What this project includes

- A Next.js app with four routes:
  - `/` overview
  - `/issue` issue a local demo credential
  - `/passport` generate proof flow
  - `/verify` read public verification result
- A Compact smart contract in `pkgs/contract/src/patient_registry.compact`
- Browser-side witness provider in `lib/witnessProvider.ts`
- Midnight wallet integration in `lib/midnight-client.ts`
- Official Midnight proof server setup with Docker

## How the user flow works

1. On `/issue`, the app creates a signed-looking demo health record and stores it in localStorage.
2. On `/passport`, the app reads that local record as witness input and starts proof generation.
3. On `/verify`, a verifier checks the public ledger-facing result.

In plain terms: issue privately, prove privately, verify publicly.

## Tech stack

- Next.js 16 + React 19 + TypeScript
- Midnight packages:
  - `@midnight-ntwrk/dapp-connector-api`
  - `@midnight-ntwrk/midnight-js-contracts`
  - `@midnight-ntwrk/midnight-js-types`
  - `@midnight-ntwrk/midnight-js-utils`
- Compact language contract
- Dockerized Midnight proof server

## Project structure

- `app/` Next.js routes and UI
- `components/WalletConnect.tsx` shared wallet connection UI
- `lib/midnight-client.ts` Midnight wallet/proof client wiring
- `lib/midnightClient.ts` export alias for compatibility
- `lib/walletContext.tsx` global wallet state across routes
- `lib/witnessProvider.ts` browser witness functions and local record helpers
- `managed/contracts/` compiled contract artifacts (currently placeholders until compile)
- `pkgs/contract/src/patient_registry.compact` contract source
- `docker-compose.yml` Midnight proof server service

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Prepare environment

Create a local env file from the template:

```bash
cp .env.local.example .env.local
```

Default local network in template is set to:

```bash
NEXT_PUBLIC_MIDNIGHT_NETWORK=undeployed
```

When you move to preprod, change it to `preprod`.

### 3. Install Compact compiler toolchain

Make sure `compactc` is available:

```bash
compactc --version
```

### 4. Compile contract artifacts and keys

```bash
npm run compile:contract
```

### 5. Start Midnight proof server

```bash
docker-compose up
```

Health check:

```bash
curl http://localhost:6300/health
```

### 6. Run the frontend

```bash
npm run dev
```

Open: `http://localhost:3000`

## Environment variables

Use `.env.local` with these keys:

```bash
NEXT_PUBLIC_MIDNIGHT_NETWORK=undeployed
NEXT_PUBLIC_MIDNIGHT_NODE_URL=https://rpc.midnight-preprod.example.com
NEXT_PUBLIC_PROOF_SERVER_URL=http://localhost:6300
NEXT_PUBLIC_CONTRACT_ADDRESS=
```

Notes:

- `NEXT_PUBLIC_MIDNIGHT_NETWORK` must match the network your Lace wallet is using.
- Set `NEXT_PUBLIC_CONTRACT_ADDRESS` after deployment.

## Current status

Working today:

- Wallet connect UI is integrated.
- Wallet state is shared globally via React context across pages.
- `/issue`, `/passport`, `/verify` UI flow is wired.
- Build passes.

Still pending for a full production-grade demo:

- Generate real managed artifacts and proving/verifier key material.
- Deploy contract and set real contract address.
- Replace placeholder policy logic in Compact contract with full checks.
- Complete end-to-end real on-chain proof submission and lookup wiring.

## Hackathon checklist

- [ ] Compile real artifacts and keys (`npm run compile:contract`)
- [ ] Deploy contract on target Midnight network
- [ ] Set `NEXT_PUBLIC_CONTRACT_ADDRESS`
- [ ] Validate wallet + proof flow on intended network
- [ ] Test replay prevention (nullifier reuse)
- [ ] Record and attach 2-minute demo video

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run compile:contract
```

## License

Apache-2.0
