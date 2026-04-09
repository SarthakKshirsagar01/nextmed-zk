"use client";

import { useEffect, useState } from "react";
import WalletConnect from "../../components/WalletConnect";
import {
  runProof,
  type WalletState,
  type LedgerState,
  type ProofUpdate,
} from "../../lib/midnight-client";
import { hasRecord } from "../../lib/witnessProvider";

const PROOF_STAGE_LABELS: Record<string, string> = {
  idle: "Ready",
  witness: "Reading local record",
  proving: "Generating ZK proof",
  submitting: "Submitting to chain",
  confirmed: "Confirmed on-chain",
  error: "Error",
};

export default function PassportPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [recordExists, setRecordExists] = useState(false);
  const [proofUpdate, setProofUpdate] = useState<ProofUpdate | null>(null);
  const [ledgerState, setLedgerState] = useState<LedgerState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecordExists(hasRecord());
  }, []);

  async function handleProve() {
    if (!recordExists) {
      setError(
        "No health record found on this device. Visit /issue first to get a credential.",
      );
      return;
    }

    setRunning(true);
    setError(null);
    setLedgerState(null);

    try {
      const result = await runProof(
        {
          required_vaccine: "COVID-19",
          clinic_pubkey_hash: "0xdemo_clinic_key_hash_replace_with_real",
        },
        (update) => setProofUpdate(update),
      );
      setLedgerState(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Proof generation failed.");
      setProofUpdate((prev) => (prev ? { ...prev, stage: "error" } : null));
    } finally {
      setRunning(false);
    }
  }

  const pct = proofUpdate?.pct ?? 0;

  return (
    <section className="panel">
      <h2>Patient Vault</h2>
      <p>
        Generate a privacy-preserving eligibility proof from local witness data.
      </p>

      <WalletConnect onConnected={setWallet} />

      {wallet && (
        <p style={{ fontSize: 12, opacity: 0.65, fontFamily: "monospace" }}>
          {wallet.shieldedAddress.slice(0, 12)}... ({wallet.networkId})
        </p>
      )}

      <div
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          marginTop: 8,
          marginBottom: 12,
          border: `0.5px solid ${recordExists ? "#1D9E75" : "#ccc"}`,
          background: recordExists ? "rgba(29,158,117,0.06)" : "transparent",
          fontSize: 13,
        }}
      >
        {recordExists
          ? "Health credential found on this device"
          : "No credential found. Visit /issue first."}
      </div>

      <button
        className="primary"
        onClick={handleProve}
        disabled={running || !recordExists}
        type="button"
      >
        {running ? "Generating proof..." : "Prove Vaccination"}
      </button>

      {proofUpdate && proofUpdate.stage !== "idle" && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginBottom: 6,
              fontFamily: "monospace",
              opacity: 0.7,
            }}
          >
            <span>
              {PROOF_STAGE_LABELS[proofUpdate.stage] ?? proofUpdate.stage}
            </span>
            <span>{pct}%</span>
          </div>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: "rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 2,
                width: `${pct}%`,
                background:
                  proofUpdate.stage === "error" ? "#A32D2D" : "#1D9E75",
                transition: "width .4s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 6 }}>
            {proofUpdate.message}
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {ledgerState && (
        <div className="timeline" style={{ marginTop: 14 }}>
          <p className="ok">Eligibility verified.</p>
          <ul>
            <li>is_eligible: {String(ledgerState.is_eligible)}</li>
            <li>
              verified_at:{" "}
              {new Date(ledgerState.verified_at * 1000).toLocaleString()}
            </li>
            <li>nullifier: {ledgerState.nullifier}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
