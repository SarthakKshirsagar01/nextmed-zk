"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getProofRuntimeConfig,
  getStoredAttestation,
  requestProof,
  setStoredProof,
  type ProofArtifact,
} from "../../lib/zk/proof";

export default function PassportPage() {
  const router = useRouter();
  const runtime = getProofRuntimeConfig();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState<ProofArtifact | null>(null);
  const [hasAttestation, setHasAttestation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasAttestation(Boolean(getStoredAttestation()));
  }, []);

  const generateProof = async () => {
    setGenerating(true);
    setError(null);
    setDone(null);

    try {
      const attestation = getStoredAttestation();
      if (!attestation) {
        setError("No attestation found. Go to /issue first.");
        return;
      }

      const proof = await requestProof(attestation);
      setStoredProof(proof);
      setDone(proof);
    } catch {
      setError(
        `Proof generation failed (${runtime.mode}) at ${runtime.apiBaseUrl}.`,
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="panel">
      <h2>Patient Vault</h2>
      <p>Data stays local. Proofs go to Midnight.</p>
      {!hasAttestation && (
        <p className="error">Issue an attestation first in /issue.</p>
      )}
      <button
        className="primary"
        onClick={generateProof}
        type="button"
        disabled={generating || !hasAttestation}
      >
        {generating ? "Generating Proof..." : "Generate Eligibility Proof"}
      </button>
      {done && (
        <p className="ok">
          Proof ready with nullifier {done.nullifier.slice(0, 18)}...
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button
        className="secondary"
        onClick={() => router.push("/verify")}
        type="button"
      >
        Present QR for Verification
      </button>
    </section>
  );
}
