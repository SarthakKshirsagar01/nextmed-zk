"use client";

import { useState } from "react";
import { getLedgerState, type LedgerState } from "../../lib/midnight-client";
import { useWallet } from "../../lib/walletContext";

export default function VerifyPage() {
  const { wallet } = useWallet();
  const [address, setAddress] = useState(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LedgerState | null | "not-found">(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!address.trim()) {
      setError("Enter a contract address.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const state = await getLedgerState(address.trim());
      setResult(state ?? "not-found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Verifier Scanner</h2>
      <p>Read only the public ledger result for this proof contract.</p>

      {!wallet && (
        <p className="error" style={{ fontWeight: 500 }}>
          Connect Lace wallet first.
        </p>
      )}

      <label htmlFor="contract-address">Contract address</label>
      <input
        id="contract-address"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="0x... or Midnight contract address"
      />

      <button
        className="primary"
        onClick={handleVerify}
        disabled={loading || !wallet}
        type="button"
      >
        {loading ? "Querying ledger..." : "Check Eligibility"}
      </button>

      {error && <p className="error">{error}</p>}

      {result === "not-found" && (
        <p className="error" style={{ fontWeight: 500 }}>
          No record found for this address yet.
        </p>
      )}

      {result && result !== "not-found" && (
        <div className="timeline">
          <p className="ok">Eligible = {String(result.is_eligible)}</p>
          <ul>
            <li>
              verified_at:{" "}
              {new Date(result.verified_at * 1000).toLocaleString()}
            </li>
            <li>issuer_key_hash: {result.issuer_key_hash}</li>
            <li>nullifier: {result.nullifier}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
