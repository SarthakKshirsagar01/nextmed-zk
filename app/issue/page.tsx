"use client";

import { useState, useEffect } from "react";
import {
  createDemoRecord,
  storeRecord,
  hasRecord,
  clearRecord,
} from "@/lib/witnessProvider";
import WalletConnect from "@/components/WalletConnect";
import { useWallet } from "@/lib/walletContext";

const VACCINES = [
  "COVID-19 Pfizer-BioNTech",
  "COVID-19 Moderna",
  "Influenza (Flu)",
  "Hepatitis B",
  "MMR (Measles, Mumps, Rubella)",
];

export default function IssuePage() {
  const { wallet } = useWallet();
  const [vaccine, setVaccine] = useState(VACCINES[0]);
  const [issued, setIssued] = useState(false);

  // ── HYDRATION FIX ──────────────────────────────────────────────────
  // Same pattern as passport/page.tsx — localStorage doesn't exist
  // on the server, so we initialise to false and read after mount.
  const [hasRec, setHasRec] = useState(false);
  useEffect(() => {
    setHasRec(hasRecord());
  }, []);
  // ───────────────────────────────────────────────────────────────────

  function handleIssue() {
    const demo = createDemoRecord(vaccine);
    storeRecord(demo);
    setIssued(true);
    setHasRec(true);
  }

  function handleClear() {
    clearRecord();
    setIssued(false);
    setHasRec(false);
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1rem" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>
        Clinic Issuer
      </h1>
      <p
        style={{
          fontSize: 13,
          opacity: 0.55,
          marginBottom: 24,
          fontFamily: "monospace",
        }}
      >
        /issue · issue a signed vaccination credential
      </p>

      <div style={{ marginBottom: 16 }}>
        <WalletConnect />
      </div>

      {!wallet && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
          Connect wallet to keep this session synced across pages.
        </div>
      )}

      <div
        style={{
          border: "0.5px solid var(--color-border-tertiary, #e0e0e0)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <label
          style={{
            fontSize: 13,
            fontWeight: 500,
            display: "block",
            marginBottom: 8,
          }}
        >
          Vaccine type
        </label>
        <select
          value={vaccine}
          onChange={(e) => setVaccine(e.target.value)}
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 6,
            border: "0.5px solid var(--color-border-secondary, #ccc)",
            background: "transparent",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {VACCINES.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>

        <button
          onClick={handleIssue}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: 8,
            background: "#1D9E75",
            color: "#fff",
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Issue Credential to Patient Device
        </button>
      </div>

      {issued && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: "rgba(29,158,117,0.08)",
            border: "0.5px solid #1D9E75",
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          ✓ Credential stored in this browser&apos;s localStorage. The patient
          can now prove vaccination at <strong>/passport</strong>.
        </div>
      )}

      {hasRec && !issued && (
        <div style={{ fontSize: 12, opacity: 0.55, marginBottom: 8 }}>
          A credential already exists on this device.
        </div>
      )}

      {hasRec && (
        <button
          onClick={handleClear}
          style={{
            fontSize: 12,
            opacity: 0.5,
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Clear stored credential
        </button>
      )}

      <div
        style={{
          marginTop: 24,
          padding: "12px 16px",
          borderRadius: 8,
          background: "rgba(0,0,0,0.03)",
          fontSize: 12,
          opacity: 0.6,
          lineHeight: 1.6,
        }}
      >
        <strong>Privacy note:</strong> The credential is stored only in this
        browser&apos;s localStorage. No server receives it. In production, the
        clinic signs it with an ed25519 private key — but the storage path is
        identical.
      </div>
    </main>
  );
}
