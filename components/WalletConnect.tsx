"use client";

// ============================================================
// components/WalletConnect.tsx
//
// Connects to the Midnight Lace wallet.
// Uses connectWallet() from midnightClient.ts — real Lace API.
// ============================================================

import { useState } from "react";
import { connectWallet, type WalletState } from "../lib/midnight-client";

interface WalletConnectProps {
  onConnected?: (wallet: WalletState) => void;
}

export default function WalletConnect({ onConnected }: WalletConnectProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);

  const short = (addr: string) =>
    addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const state = await connectWallet();
      setWallet(state);
      onConnected?.(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  if (wallet) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderRadius: 8,
          border: "0.5px solid #1D9E75",
          background: "rgba(29,158,117,0.06)",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            Lace wallet connected
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              opacity: 0.6,
              marginTop: 2,
            }}
          >
            {short(wallet.shieldedAddress)} · {wallet.networkId}
          </div>
        </div>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#1D9E75",
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 8,
          border: "0.5px solid var(--color-border-secondary, #ccc)",
          background: "transparent",
          cursor: loading ? "wait" : "pointer",
          fontSize: 14,
          fontWeight: 500,
          opacity: loading ? 0.6 : 1,
          transition: "opacity .15s",
        }}
      >
        {loading ? "Connecting to Lace..." : "Connect Lace Wallet"}
      </button>

      {error && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(162,45,45,0.08)",
            border: "0.5px solid rgba(162,45,45,0.3)",
            fontSize: 12,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
            color: "#A32D2D",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
