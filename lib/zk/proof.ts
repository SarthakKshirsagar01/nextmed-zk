"use client";

// ============================================================
// lib/zk/proof.ts
//
// Midnight circuit types and proof orchestration for
// patient_registry.compact circuits.
//
// Replaces the old mock proof.ts that used witnessHash/sha256
// and had nothing to do with Midnight ZK proofs.
// ============================================================

import { createWitnessProvider, hasRecord } from "../witnessProvider";

// ── Proof update callback type ─────────────────────────────────

export interface ProofUpdate {
  stage: "witness" | "proving" | "submitting" | "confirmed";
  pct: number;
  message: string;
}

// ── Circuit parameter types ───────────────────────────────────
// These match the public inputs declared in patient_registry.compact

export interface VaccinationProofParams {
  required_vaccine: string; // Opaque<"string"> in circuit
  max_record_age: bigint; // Field in circuit (seconds, e.g. 31536000n = 1 year)
  clinic_pubkey_hash: string; // used for witness + ledger
}

export interface InsuranceProofParams {
  required_procedure_code: string; // Opaque<"string"> in circuit
  clinic_pubkey_hash: string;
}

// ── Proof result (maps from circuit's disclosed ledger state) ─

export interface ProofResult {
  is_eligible: boolean;
  verified_at: number; // Unix timestamp
  issuer_key_hash: string;
  nullifier: string;
  tx_hash?: string; // set after real on-chain submission
}

// ── Witness validation ────────────────────────────────────────
// Run before calling the proof server — catches missing data
// early with a clear message rather than a cryptic SDK error.

export function validateWitnessInputs(params: VaccinationProofParams): void {
  if (!hasRecord()) {
    throw new Error(
      "No health record found on this device.\n" +
        "Visit /issue to get a credential first.",
    );
  }

  const provider = createWitnessProvider();

  // Verify claimed_vaccine_id is populated
  const claimedId = provider.claimed_vaccine_id();
  if (!claimedId) {
    throw new Error("Vaccine ID is missing from the stored credential.");
  }

  // Verify the claimed vaccine matches what the verifier requires
  // (circuit will assert this too, but checking here gives a better error)
  if (claimedId !== params.required_vaccine) {
    throw new Error(
      `Vaccine mismatch: credential contains "${claimedId}" ` +
        `but verifier requires "${params.required_vaccine}".`,
    );
  }

  // Verify issuer hash is present
  const issuerHash = provider.expected_issuer_hash();
  if (!issuerHash) {
    throw new Error("Issuer hash is missing from the stored credential.");
  }
}

// ── Scaffold proof runner ─────────────────────────────────────
// Used when managed artifacts are placeholders (pre-deployment).
// Runs real witness validation so the data flow is exercised,
// but skips the actual ZK proof generation and chain submission.

export async function runScaffoldProof(
  params: VaccinationProofParams,
  onUpdate: (u: ProofUpdate) => void,
): Promise<ProofResult> {
  onUpdate({
    stage: "witness",
    pct: 20,
    message: "Validating witness inputs...",
  });

  // Real witness validation — not fake
  validateWitnessInputs(params);

  const provider = createWitnessProvider();

  onUpdate({
    stage: "proving",
    pct: 45,
    message: "Scaffold mode: artifacts not yet compiled.",
  });
  await delay(800);

  onUpdate({
    stage: "proving",
    pct: 70,
    message: "Scaffold proof simulation...",
  });
  await delay(600);

  onUpdate({
    stage: "submitting",
    pct: 85,
    message: "Scaffold: skipping chain submission.",
  });
  await delay(400);

  onUpdate({
    stage: "confirmed",
    pct: 100,
    message: "Scaffold complete. Run compactc to enable real proving.",
  });

  return {
    is_eligible: true,
    verified_at: Number(provider.current_timestamp()),
    issuer_key_hash: params.clinic_pubkey_hash,
    nullifier: provider.proof_nonce(),
  };
}

// ── Real proof runner (activate after compactc + deployment) ──
// Uncomment this and call it instead of runScaffoldProof
// once managed artifacts are generated and contract is deployed.
//
// export async function runRealProof(
//   api: ConnectedAPI,
//   params: VaccinationProofParams,
//   onUpdate: (u: ProofUpdate) => void
// ): Promise<ProofResult> {
//
//   onUpdate({ stage: "witness", pct: 15, message: "Reading local health record..." });
//   validateWitnessInputs(params);
//
//   const provingProvider = await api.getProvingProvider();
//   const witnessProvider = createWitnessProvider();
//
//   onUpdate({ stage: "proving", pct: 35, message: "Generating ZK proof (1–3 seconds)..." });
//
//   // Build the contract instance using midnight-js-contracts
//   // const contract = new PatientRegistryContract(managedArtifact, witnessProvider);
//   // const tx = await contract.proveVaccination(
//   //   params.required_vaccine,
//   //   params.max_record_age,
//   //   provingProvider
//   // );
//
//   onUpdate({ stage: "submitting", pct: 80, message: "Submitting to Midnight network..." });
//
//   // const result = await api.submitTransaction(tx);
//   // const state = await contract.getLedgerState();
//
//   onUpdate({ stage: "confirmed", pct: 100, message: "Verified on-chain." });
//
//   return {
//     is_eligible:     state.is_eligible,
//     verified_at:     Number(state.verified_at),
//     issuer_key_hash: state.issuer_key_hash,
//     nullifier:       state.nullifier,
//     tx_hash:         result.txHash,
//   };
// }

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
