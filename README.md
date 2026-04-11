# NextMed — ZK Health Passport

> **Prove health. Protect privacy.**

A privacy-first vaccination attestation system built on **Midnight Network**. Patients prove specific health claims — vaccination status, insurance coverage, clinical trial eligibility — without revealing their identity, clinic, or medical records to anyone.

---

## The Problem

When a hospital asks "are you vaccinated?", today's systems force patients to share their full medical record. The verifier learns your name, clinic, vaccine brand, batch number, and date — far more than they need.

**NextMed fixes this with a single principle: prove the minimum, disclose nothing else.**

---

## How It Works

```
Patient's Device (private)          Midnight Blockchain (public)
────────────────────────────        ────────────────────────────
Health credential (local)
        ↓
6 witness functions fetch data
        ↓
ZK circuit runs locally
        ↓
Proof generated in ~1 second
        ↓                           is_eligible: true
  proof + outcome ────────────────► verified_at: [timestamp]
                                    issuer_hash: AUTHORISED_PROVIDER
                                    nullifier:   [replay blocked]
```

**The patient's health data never reaches the blockchain. Ever.**

---

## Midnight Network Integration

### Smart Contract

**File:** `pkgs/contract/src/patient_registry.compact`  
**Language:** Compact (Midnight's ZK circuit DSL)

#### Witness functions — private inputs fetched from patient device

```compact
witness local_health_record():  Opaque<"string">;  // full EHR — private
witness clinic_signature():     Opaque<"string">;  // ed25519 sig — private
witness claimed_vaccine_id():   Opaque<"string">;  // vaccine claim — private
witness expected_issuer_hash(): Opaque<"string">;  // issuer category — private
witness current_timestamp():    Field;
witness proof_nonce():          Opaque<"string">;  // replay prevention
```

#### Circuit logic — what gets verified

```compact
export circuit proveVaccination(required_vaccine: Opaque<"string">, ...): [] {
  // 1. Replay prevention
  assert !nullifier_used "Proof nonce already consumed.";

  // 2. Vaccine type must match what verifier requires
  const vaccine_match = vaccine_id == required_vaccine;
  assert vaccine_match "Credential does not contain required vaccine.";

  // 3. Record must come from an authorised issuer
  const issuer_valid = issuer_hash == expected_issuer_hash();
  assert issuer_valid "Issuer does not match authorised category.";

  // 4. Publish ONLY the outcome — nothing else
  is_eligible     = disclose(true);
  verified_at     = disclose(now);
  issuer_key_hash = disclose(issuer_hash);
  nullifier       = disclose(nonce);
  nullifier_used  = disclose(true);
}
```

#### What is disclosed vs what stays private

| On-chain (public)         | Private (never leaves device)  |
| ------------------------- | ------------------------------ |
| `is_eligible: true/false` | Patient name and identity      |
| `verified_at: timestamp`  | Vaccine brand and batch number |
| `issuer_hash: category`   | Clinic name and location       |
| `nullifier: spent token`  | Full Electronic Health Record  |

### Rational Privacy

Verifiers receive exactly one meaningful bit: **Eligible = true**. They gain cryptographic assurance the claim is valid without learning anything about the underlying health data. This is Midnight's "Validity without Visibility" in practice.

---

## Application Routes

| Route       | Actor               | What happens                                                   |
| ----------- | ------------------- | -------------------------------------------------------------- |
| `/`         | Anyone              | Landing — explains the privacy model                           |
| `/issue`    | Clinic / Doctor     | Signs and issues a vaccination credential to patient's device  |
| `/passport` | Patient             | Connects Lace wallet, generates ZK proof, sees verified result |
| `/verify`   | Hospital / Employer | Reads public ledger — sees `is_eligible` only                  |

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- Docker Desktop (for Midnight Proof Server)
- [Lace Wallet](https://www.lace.io) browser extension with Midnight enabled
- Midnight toolchain (`compactc`) from [docs.midnight.network](https://docs.midnight.network)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Compile the smart contract
bash compile.sh
# Outputs: managed/patient_registry.pk, .vk, .zkir

# 3. Start Midnight Proof Server (keep running in separate terminal)
docker-compose up midnight-proof-server
# Verify: curl http://localhost:6300/health

# 4. Configure environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_MIDNIGHT_NETWORK=undeployed (or preprod after deployment)

# 5. Start the app
npm run dev
# Open: http://localhost:3000
```

### Full flow test

1. **`/issue`** — select a vaccine, click "Issue Credential to Patient Device"
2. Open DevTools → Application → Local Storage → see `nextmed:signed_record`
3. **`/passport`** — connect Lace wallet, click "Prove Vaccination", watch 5-stage proof progress
4. See the green "Eligibility Verified" card with `is_eligible: true` and nullifier
5. **`/verify`** — enter contract address, see only the public ledger state

---

## Project Structure

````
## 📁 Project Structure

```id="4b8p2r"
nextmed-zk/
├── app/
│   ├── page.tsx                    ← Landing page
│   ├── layout.tsx                  ← Root layout
│   ├── globals.css                 ← Global styles
│   ├── issue/
│   │   └── page.tsx                ← Issuer dashboard
│   ├── passport/
│   │   └── page.tsx                ← Patient vault
│   └── verify/
│       └── page.tsx                ← Verifier scanner
│
├── components/
│   └── WalletConnect.tsx           ← Wallet connection UI
│
├── lib/
│   ├── witnessProvider.ts          ← Witness functions
│   ├── midnightClient.ts           ← Wallet + proof logic
│   ├── walletContext.tsx           ← Global wallet state
│   └── zk/
│       └── proof.ts                ← ZK proof logic
│
├── contracts/
│   └── Patient_registry/           ← Smart contract folder
│
├── compiler/
│   ├── index.cjs
│   ├── index.d.ts
│   └── index.js
│
├── zk/
│   ├── Provelnsurance
│   ├── Provelnsurance...
│   ├── ProveVaccination
│   ├── revokeEligibility
│   └── revokeEligibility...
│
├── node_modules/
├── public/
│   ├── favicon.svg
│   ├── next.svg
│   └── vercel.svg
│
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── README.md
└── docker-compose.yml
````

---

## Contract Deployment

- **Network:** Midnight Preprod
- **Status:** Contract architecture complete. Deployment requires compactc toolchain.
- **Funded wallet (Preprod):**  
  `mn_addr_preprod1utet23zywk7uzt2f9crmpqpr3wdmevnr5qwhlhems0m5w96nzj2qsgwu9m`
- **Contract source:** `pkgs/contract/src/patient_registry.compact`
- **Circuits:** proveVaccination, proveInsuranceCoverage, revokeEligibility

---

## Hackathon Submission Checklist

- [x] Built on Midnight Network (Compact contract with witness context)
- [x] Privacy and selective disclosure (6 witness functions, Opaque types, explicit disclose())
- [x] Confidential smart contracts (nullifier, 3 circuits, ZK-SNARK proof pipeline)
- [x] Real-world problem (healthcare data over-disclosure)
- [x] Lace wallet integration (connectWallet, shielded address)
- [x] Docker setup (midnightntwrk/proof-server:8.0.3)
- [x] Apache-2.0 license
- [x] Public GitHub repository
- [x]Demo video: _[https://www.loom.com/share/78d2b931cbde43c69da17ddfb2a65ec4]_

---

## License

[Apache-2.0](./LICENSE)
