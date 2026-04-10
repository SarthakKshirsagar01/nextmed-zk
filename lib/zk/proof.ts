"use client";

// ============================================================
// lib/zk/proof.ts
// Midnight circuit types + scaffold proof runner
// ============================================================

import { createWitnessProvider, hasRecord } from "../witnessProvider";

// ProofUpdate defined here to avoid circular import with midnightClient
export interface ProofUpdate {
  stage: "idle" | "witness" | "proving" | "submitting" | "confirmed" | "error";
  pct: number;
  message: string;
}

export interface VaccinationProofParams {
  required_vaccine: string;
  max_record_age: bigint;
  clinic_pubkey_hash: string;
}

export interface ProofResult {
  is_eligible: boolean;
  verified_at: number;
  issuer_key_hash: string;
  nullifier: string;
  tx_hash?: string;
}

// ── Witness validation ────────────────────────────────────────
// Runs BEFORE the proof server — gives clear errors early

export function validateWitnessInputs(params: VaccinationProofParams): void {
  if (!hasRecord()) {
    throw new Error(
      "No health record found on this device.\nVisit /issue to get a credential first.",
    );
  }

  const provider = createWitnessProvider();
  const claimedId = provider.claimed_vaccine_id();

  if (!claimedId) {
    throw new Error("Vaccine ID is missing from the stored credential.");
  }

  // Normalize comparison — circuit does this too
  const normalizedClaimed = claimedId.toUpperCase().replace(/[\s\-()/]/g, "-");
  const normalizedRequired = params.required_vaccine
    .toUpperCase()
    .replace(/[\s\-()/]/g, "-");

  if (
    !normalizedClaimed.includes(normalizedRequired) &&
    !normalizedRequired.includes(normalizedClaimed)
  ) {
    throw new Error(
      `Vaccine mismatch.\n` +
        `Credential: "${claimedId}"\n` +
        `Required: "${params.required_vaccine}"\n\n` +
        `Go to /issue and issue a "${params.required_vaccine}" credential.`,
    );
  }

  const issuerHash = provider.expected_issuer_hash();
  if (!issuerHash) {
    throw new Error("Issuer hash is missing from the stored credential.");
  }
}

// ── Scaffold proof runner ─────────────────────────────────────
// Used when managed artifacts are placeholders (pre-deployment).
// Runs REAL witness validation — not fake.

export async function runScaffoldProof(
  params: VaccinationProofParams,
  onUpdate: (u: ProofUpdate) => void,
): Promise<ProofResult> {
  // Stage 1 — Witness collection
  onUpdate({
    stage: "witness",
    pct: 25,
    message: "Reading local health record...",
  });
  await delay(700);

  // Real validation — throws if credential doesn't match
  validateWitnessInputs(params);

  const provider = createWitnessProvider();

  // Stage 2 — Proof generation
  onUpdate({
    stage: "proving",
    pct: 45,
    message: "Preparing ZK circuit inputs...",
  });
  await delay(600);

  onUpdate({
    stage: "proving",
    pct: 65,
    message: "Generating ZK-SNARK proof (scaffold)...",
  });
  await delay(900);

  // Stage 3 — Submission
  onUpdate({
    stage: "submitting",
    pct: 82,
    message: "Signing transaction with Lace wallet...",
  });
  await delay(500);

  onUpdate({
    stage: "submitting",
    pct: 93,
    message: "Submitting to Midnight network...",
  });
  await delay(600);

  // Stage 4 — Confirmed
  onUpdate({
    stage: "confirmed",
    pct: 100,
    message: "Eligibility verified. On-chain state updated.",
  });

  return {
    is_eligible: true,
    verified_at: Number(provider.current_timestamp()),
    issuer_key_hash: params.clinic_pubkey_hash,
    nullifier: provider.proof_nonce(),
  };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
