"use client";

import { useEffect, useState } from "react";
import {
  getProofRuntimeConfig,
  getStoredProof,
  verifyProof,
  type VerifyResult,
} from "../../lib/zk/proof";

export default function VerifyPage() {
  const runtime = getProofRuntimeConfig();
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState<VerifyResult | null>(null);
  const [hasProof, setHasProof] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasProof(Boolean(getStoredProof()));
  }, []);

  const runVerify = async () => {
    setChecking(true);
    setVerified(null);
    setError(null);

    try {
      const proof = getStoredProof();
      if (!proof) {
        setError("No proof found. Generate one in /passport first.");
        return;
      }

      const result = await verifyProof(proof);
      setVerified(result);
    } catch {
      setError(
        `Verification failed (${runtime.mode}) at ${runtime.apiBaseUrl}.`,
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="panel">
      <h2>Verifier Scanner</h2>
      <p>Verifier learns only one fact: eligibility true or false.</p>
      {!hasProof && <p className="error">Generate proof first in /passport.</p>}
      <button
        className="primary"
        onClick={runVerify}
        type="button"
        disabled={checking || !hasProof}
      >
        {checking ? "Verifying..." : "Verify Eligibility"}
      </button>
      {verified?.valid && (
        <div className="timeline">
          <p className="ok">
            Eligible = {String(verified.isEligible ?? false)}
          </p>
          <ul>
            <li>Provider signature verified in proof</li>
            <li>Nullifier uniqueness checked on-chain</li>
            <li>No patient identity disclosed</li>
          </ul>
        </div>
      )}
      {verified && !verified.valid && (
        <p className="error">
          Verification rejected: {verified.reason || "Unknown reason"}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
