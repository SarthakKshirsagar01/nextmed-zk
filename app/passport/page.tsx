"use client";

import { useState, useEffect } from "react";
import WalletConnect from "@/components/WalletConnect";
import { useWallet } from "@/lib/walletContext";
import { runProof, type LedgerState } from "@/lib/midnightClient";
import type { ProofUpdate } from "@/lib/zk/proof";
import { hasRecord } from "@/lib/witnessProvider";

const STAGE_LABELS: Record<string, string> = {
  witness: "Reading local record",
  proving: "Generating ZK proof",
  submitting: "Submitting to chain",
  confirmed: "Confirmed on-chain",
  error: "Error",
};

export default function PassportPage() {
  const { wallet } = useWallet();
  const [proofUpdate, setProofUpdate] = useState<ProofUpdate | null>(null);
  const [ledgerState, setLedgerState] = useState<LedgerState | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydration fix — localStorage only available in browser
  const [recordExists, setRecordExists] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setRecordExists(hasRecord());
    setMounted(true);
  }, []);

  async function handleProve() {
    if (!recordExists) {
      setError("No health record on this device. Visit /issue first.");
      return;
    }
    setRunning(true);
    setError(null);
    setLedgerState(null);
    setProofUpdate(null);

    try {
      const result = await runProof(
        {
          required_vaccine: "COVID-19",
          clinic_pubkey_hash: "AUTHORISED_PROVIDER_HASH_v1",
        },
        (update) => setProofUpdate(update),
      );
      setLedgerState(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Proof generation failed.";
      setError(msg);
      setProofUpdate((p) => (p ? { ...p, stage: "error" } : null));
    } finally {
      setRunning(false);
    }
  }

  const pct = proofUpdate?.pct ?? 0;

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
        Patient Vault
      </h1>
      <p
        style={{
          fontSize: 13,
          opacity: 0.55,
          marginBottom: 24,
          fontFamily: "monospace",
        }}
      >
        /passport · generate your eligibility proof
      </p>

      <div style={{ marginBottom: 12 }}>
        <WalletConnect />
      </div>

      {mounted && wallet && (
        <div
          style={{
            fontSize: 12,
            fontFamily: "monospace",
            opacity: 0.45,
            marginBottom: 16,
          }}
        >
          {wallet.shieldedAddress.slice(0, 22)}… ({wallet.networkId})
        </div>
      )}

      {/* Record status */}
      {mounted && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            border: `0.5px solid ${recordExists ? "#1D9E75" : "#ccc"}`,
            background: recordExists ? "rgba(29,158,117,0.06)" : "transparent",
            fontSize: 13,
          }}
        >
          {recordExists
            ? "✓ Health credential found on this device"
            : "✗ No credential — visit /issue first"}
        </div>
      )}

      {/* Prove button */}
      <button
        onClick={handleProve}
        disabled={running || !recordExists || !mounted}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 8,
          background: running || !recordExists ? "#ccc" : "#0C447C",
          color: "#fff",
          border: "none",
          fontSize: 14,
          fontWeight: 500,
          cursor: running || !recordExists ? "not-allowed" : "pointer",
          transition: "background .2s",
        }}
      >
        {running ? "Generating proof…" : "Prove Vaccination"}
      </button>

      {/* Progress bar */}
      {proofUpdate && proofUpdate.stage !== "idle" && (
        <div style={{ marginTop: 20 }}>
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
            <span>{STAGE_LABELS[proofUpdate.stage] ?? proofUpdate.stage}</span>
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
                transition: "width .5s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, marginTop: 6 }}>
            {proofUpdate.message}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(162,45,45,0.08)",
            border: "0.5px solid rgba(162,45,45,0.3)",
            fontSize: 12,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            color: "#A32D2D",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* On-chain result card */}
      {ledgerState && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 12,
            border: "1.5px solid #1D9E75",
            background: "rgba(29,158,117,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              marginBottom: 12,
              color: "#0F6E56",
            }}
          >
            ✓ Eligibility Verified On-Chain
          </div>

          <table
            style={{
              width: "100%",
              fontSize: 12,
              fontFamily: "monospace",
              borderCollapse: "collapse",
            }}
          >
            <tbody>
              {(
                [
                  ["is_eligible", String(ledgerState.is_eligible)],
                  [
                    "verified_at",
                    new Date(ledgerState.verified_at * 1000).toLocaleString(),
                  ],
                  [
                    "issuer_key_hash",
                    ledgerState.issuer_key_hash.slice(0, 26) + "…",
                  ],
                  ["nullifier", ledgerState.nullifier.slice(0, 26) + "…"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: "5px 0", opacity: 0.5, width: "38%" }}>
                    {k}
                  </td>
                  <td style={{ padding: "5px 0" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: 14,
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(0,0,0,0.04)",
              fontSize: 11,
              opacity: 0.5,
              lineHeight: 1.6,
            }}
          >
            This is the complete public ledger record. Patient identity, vaccine
            details, and clinical data are not stored here.
          </div>
        </div>
      )}
    </main>
  );
}
