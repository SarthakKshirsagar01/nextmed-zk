# NextMed ZK Health

NextMed is a Midnight project that demonstrates private vaccination verification.

Goal in one sentence:
show that a patient is eligible without exposing private medical data.

The app has three user-facing steps:

- Issue a credential
- Generate a proof
- Verify the public result

## Why this project exists

In many real-world workflows, a verifier only needs a yes/no answer, not full records.
NextMed focuses on that exact model:

- the patient keeps the detailed record private
- the verifier reads only the public on-chain output

## Project structure

Top-level overview:

- app/
  - page.tsx (home)
  - issue/page.tsx (clinic-side issuance demo)
  - passport/page.tsx (patient proof flow)
  - verify/page.tsx (verifier lookup)
  - layout.tsx (global layout and provider wiring)
- components/
  - WalletConnect.tsx (Lace connect UI)
- lib/
  - midnight-client.ts (wallet + proof + ledger client logic)
  - midnightClient.ts (re-export compatibility layer)
  - walletContext.tsx (shared wallet state across routes)
  - witnessProvider.ts (local witness functions + record helpers)
  - zk/proof.ts (local zk helper utilities)
- pkgs/contract/src/
  - patient_registry.compact (Compact contract source)
- managed/contracts/
  - patient_registry.managed.json
  - patient_registry.abi.json
  - patient_registry.bytecode
- docker-compose.yml (Midnight proof server service)
- compile.sh (contract compile entry point)

## Contract details

Contract source:

- pkgs/contract/src/patient_registry.compact

Language and imports:

- pragma language_version 0.22
- import CompactStandardLibrary
- Compiled with compact 0.5.1 (compactc 0.30.0)

### Public ledger fields

The contract currently exports these on-chain fields:

- is_eligible: Boolean
- verified_at: Field
- issuer_key_hash: Opaque string
- nullifier: Opaque string
- nullifier_used: Boolean

Meaning:

- is_eligible indicates pass/fail
- verified_at stores verification time
- issuer_key_hash stores the expected clinic key hash
- nullifier stores one-use proof nonce
- nullifier_used enforces replay protection

### Witness functions

The contract declares four witness inputs:

- local_health_record(): Opaque string
- clinic_signature(): Opaque string
- current_timestamp(): Field
- proof_nullifier(): Opaque string

In this project, these are implemented in browser code via:

- lib/witnessProvider.ts

### Exported circuits

1. prove_vaccination_eligibility(required_vaccine, clinic_pubkey_hash)

Current behavior:

- reads witness record/signature/timestamp/nullifier
- checks replay guard: assert !nullifier_used
- writes disclosed values to ledger fields
- sets nullifier_used to true

Important implementation note:

- signature and vaccine checks are currently placeholders in contract code
- sig_valid and has_vaccine are hardcoded true today

2. revoke_eligibility()

Current behavior:

- sets is_eligible to false
- updates verified_at
- clears nullifier_used

## Contract artifact status

Compiled with compact 0.5.1 (compiler 0.30.0, language 0.22.0):

- managed/contract/index.js -> TypeScript bindings (639 lines)
- managed/contract/index.d.ts -> Type definitions
- managed/keys/*.prover -> Proving keys for all 3 circuits
- managed/keys/*.verifier -> Verification keys for all 3 circuits
- managed/zkir/*.zkir -> ZK intermediate representations
- managed/compiler/contract-info.json -> Compiler metadata

## Wallet and network behavior

- Wallet integration uses Midnight dapp connector API in lib/midnight-client.ts
- Wallet session is shared across pages through lib/walletContext.tsx
- Stable network ID is taken from NEXT_PUBLIC_MIDNIGHT_NETWORK

If wallet and app network IDs do not match, connection fails.

## Local setup

1. Install dependencies

   npm install

2. Create local environment file

   cp .env.local.example .env.local

3. Verify Compact compiler

   compactc --version

4. Compile contract artifacts

   npm run compile:contract

5. Start proof server

   docker-compose up

6. Check server health

   curl http://localhost:6300/health

7. Start frontend

   npm run dev

Open http://localhost:3000

## Environment variables

Set in .env.local:

- NEXT_PUBLIC_MIDNIGHT_NETWORK
- NEXT_PUBLIC_MIDNIGHT_NODE_URL
- NEXT_PUBLIC_PROOF_SERVER_URL
- NEXT_PUBLIC_CONTRACT_ADDRESS

Recommended while local wallet is undeployed:

- NEXT_PUBLIC_MIDNIGHT_NETWORK=undeployed

When moving to preprod:

- NEXT_PUBLIC_MIDNIGHT_NETWORK=preprod

## Available scripts

- npm run dev
- npm run build
- npm run start
- npm run lint
- npm run compile:contract

## Hackathon readiness checklist

- [x] Generate real managed artifacts and proving/verifier keys
- [ ] Deploy contract and set NEXT_PUBLIC_CONTRACT_ADDRESS
- [ ] Run full issue -> passport -> verify flow on target network
- [ ] Validate nullifier replay protection behavior
- [ ] Record short demo video

## Contract Deployment

### Compilation

The Compact contract has been compiled with the Midnight toolchain:

- Toolchain: compact 0.5.1
- Compiler: compactc 0.30.0
- Language: Compact 0.22.0
- Source: pkgs/contract/src/patient_registry.compact

All artifacts are in managed/:

- contract/index.js (639 lines of TypeScript bindings)
- keys/proveVaccination.prover + .verifier
- keys/proveInsuranceCoverage.prover + .verifier
- keys/revokeEligibility.prover + .verifier
- zkir/*.zkir (ZK intermediate representations)

### Network

- Network: Midnight Preprod
- Proof Server: midnightntwrk/proof-server:8.0.3 (docker-compose)
- Wallet: Funded on Preprod (tNight + DUST)

### Deployment Status

The contract is fully compiled and ready for on-chain deployment.
Deployment on the Midnight network requires the Lace wallet browser
extension for transaction signing via the DApp connector API.
The frontend integrates with the Midnight DApp connector to handle
wallet connection, proof generation, and contract deployment.

Run `node lib/deploy.mjs` to verify all artifacts and proof server health.

## License

Apache-2.0
