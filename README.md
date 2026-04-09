# NextMed Vaccination Attestation MVP

NextMed is a privacy-first Midnight MVP focused on one proof:

The patient has a valid vaccination attestation signed by an authorized provider, without exposing patient identity, clinic identity, or event date.

## Project Structure

- Contract source: pkgs/contract/src/patient_registry.compact
- App routes: /, /issue, /passport, /verify
- Frontend storage helpers: lib/zk/proof.ts
- Witness provider helpers: lib/witnessProvider.ts
- Midnight client wiring: lib/midnightClient.ts
- Managed compile output: managed/

## Run Locally

1. Install dependencies

npm install

2. Install Compact toolchain and verify compiler

compactc --version

3. Compile contract artifacts and proving keys

npm run compile:contract

4. Start Midnight Proof Server (official image)

docker-compose up

5. Verify proof-server health

curl http://localhost:6300/health

6. Start frontend

npm run dev

## Environment Setup

Create .env.local from .env.example and set values:

NEXT_PUBLIC_MIDNIGHT_NETWORK=preprod
NEXT_PUBLIC_MIDNIGHT_NODE_URL=https://rpc.midnight-preprod.example.com
NEXT_PUBLIC_PROOF_SERVER_URL=http://localhost:6300
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed-contract-address>

## Current Wiring Notes

- /issue creates and stores an attestation locally.
- /passport converts the local attestation into witness material and runs proof flow via lib/midnightClient.ts.
- /verify reads ledger-facing state via lib/midnightClient.ts.
- Nullifier state is represented on-chain in the Compact contract ledger fields.

## Submission Checklist

- [ ] Generate real managed output and proving/verification keys with compactc
- [ ] Deploy contract and set NEXT_PUBLIC_CONTRACT_ADDRESS
- [ ] Validate wallet flow against Midnight preprod
- [ ] Validate replay prevention with nullifier reuse test
- [ ] Add 2-minute demo link
