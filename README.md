# NextMed Vaccination Attestation MVP

NextMed is a privacy-first Midnight MVP focused on one explicit proof:

The patient has a valid vaccination attestation signed by an authorized provider, without exposing patient identity, clinic identity, or event date.

## Production Contract

Path:

- pkgs/contract/src/patient_registry.compact

Key properties:

- Uses provider signature verification over private record hash.
- Uses a nullifier in public ledger state to prevent duplicate use of the same event.
- Returns only a boolean success signal via disclose(true).

## Managed Artifacts

Scaffolded output path:

- managed/README.md
- managed/contracts/patient_registry.managed.json
- managed/contracts/patient_registry.abi.json
- managed/contracts/patient_registry.bytecode

These are placeholders and should be replaced by real compile outputs before submission.

## URL-Based Routing (Next.js App Router)

Routes:

- / (Landing)
- /issue (Doctor Issuer Dashboard)
- /passport (Patient Vault)
- /verify (Verifier Scanner)

Structure:

- app/layout.tsx
- app/page.tsx
- app/issue/page.tsx
- app/passport/page.tsx
- app/verify/page.tsx
- components/WalletConnect.tsx

## Run Locally

1. Install dependencies

npm install

2. Compile smart contract artifacts

npm run compile:contract

3. Start development server

npm run dev

4. Build for production

npm run build

5. Start production server

npm run start

## Docker Setup (Local Proof Service + Ledger)

**NEW:** Full working stack with mock Midnight prover + PostgreSQL ledger.

1. Install Docker Desktop: https://docker.com/products/docker-desktop
2. From workspace root:

```bash
docker-compose up --build
```

This starts:

- PostgreSQL ledger on port 5432
- Mock proof server on port 9090
- Automatic database initialization

For detailed instructions, troubleshooting, and API examples, see:
**[DOCKER_SETUP.md](DOCKER_SETUP.md)**

Test service health:

```bash
curl http://localhost:9090/health
```

## Proof Provider Configuration

The frontend now supports two runtime modes using environment variables:

- mock-http: calls local mock proof server endpoints
- midnight-http: calls a Midnight bridge/prover API with the same app flow

Create a local env file from `.env.example` and set values as needed.

Default local mode:

```bash
NEXT_PUBLIC_PROOF_PROVIDER=mock-http
NEXT_PUBLIC_PROOF_API_URL=http://localhost:9090
```

Midnight bridge mode:

```bash
NEXT_PUBLIC_PROOF_PROVIDER=midnight-http
NEXT_PUBLIC_MIDNIGHT_API_URL=https://your-midnight-bridge.example
NEXT_PUBLIC_MIDNIGHT_PROVE_PATH=/prove
NEXT_PUBLIC_MIDNIGHT_VERIFY_PATH=/verify
```

The issue, passport, and verify pages do not require code changes when switching modes.

## Hackathon Readiness (April 8)

Verification snapshot (April 8):

- [x] Frontend production build passes (`npm run build`)
- [x] Proof server typecheck passes (`cd services/proof-server && npm run typecheck`)
- [ ] Contract compile gate passes (`npm run compile:contract`) - blocked: `midnight-compile` not found in PATH

Completed:

- [x] End-to-end UI flow wired: issue -> proof generation -> verification
- [x] Frontend no longer uses fake timers for proof/verify actions
- [x] Dockerized local stack for proof server + ledger
- [x] Runtime provider toggle for mock and Midnight bridge modes
- [x] Frontend production build passing

Critical pending:

- [ ] Replace mock proof logic with actual Midnight SDK or Midnight bridge implementation
- [ ] Compile and commit real managed artifacts from Compact contract
- [ ] Validate full flow with real Lace wallet on Midnight preprod
- [ ] Confirm on-chain nullifier enforcement in production contract path
- [ ] Record demo video and attach link

## Submission Checklist (April 10)

- [x] Add Apache-2.0 license in repository root.
- [ ] Include compiled contract artifacts in managed folder.
- [x] Add docker-compose.yml for local proof service wiring.
- [ ] Validate Lace wallet flow on preprod.
- [ ] Add 2-minute demo link in this README.
- [x] Explicitly document Rational Privacy and Witness Context usage.

## Rational Privacy and Witness Context

- Rational Privacy: Verifiers receive only an eligibility claim (`Eligible = true/false`) without patient identity, clinic identity, or vaccination event date.
- Witness Context: The attestation data is transformed into witness material used for proof generation, and private data remains client-side while only proof artifacts are submitted to verification endpoints.

## Fast Runbook for Final Pending Tasks

1. Install Midnight toolchain and verify compiler in PATH.

```bash
midnight-compile --version
```

2. Generate real managed artifacts and confirm placeholders are replaced.

```bash
npm run compile:contract
```

3. Start local stack and frontend.

```bash
docker-compose up --build
npm run dev
```

4. Validate preprod mode with real bridge and wallet.

```bash
# .env.local
NEXT_PUBLIC_PROOF_PROVIDER=midnight-http
NEXT_PUBLIC_MIDNIGHT_API_URL=https://your-midnight-bridge.example
NEXT_PUBLIC_MIDNIGHT_PROVE_PATH=/prove
NEXT_PUBLIC_MIDNIGHT_VERIFY_PATH=/verify
```

5. Execute replay/nullifier test.

- Generate one proof in `/passport` and verify once in `/verify` (should pass).
- Verify the same proof a second time (should fail due to nullifier replay prevention).

6. Add final demo link.

- Paste your 2-minute demo URL under the submission checklist before submission.

## 2-Minute Demo Script

0:00-0:30 (Trust Gap)

"Traditional verification exposes too much personal health data. NextMed uses Midnight to separate verification from disclosure."

0:30-1:00 (Issuer Flow on /issue)

"A doctor signs a vaccination record and sends it directly to the patient wallet. The app backend does not retain private records."

1:00-1:40 (Patient Proof on /passport)

"The patient generates a local zero-knowledge proof through witness context. Private data remains local; only proof artifacts are submitted."

1:40-2:00 (Verification on /verify)

"The verifier receives only Eligible = true/false. They gain mathematical assurance without seeing the patient identity or medical history. This is Rational Privacy."
