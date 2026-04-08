"use client";

import { useEffect, useState } from "react";
import { connectLace, detectLace } from "../lib/wallet/lace";

export default function WalletConnect() {
  const [installed, setInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(true);

  const runDetection = async () => {
    setDetecting(true);
    setError(null);
    try {
      const found = await detectLace();
      setInstalled(found);
      if (!found) {
        setError(
          "Lace provider not detected. Open/unlock Lace and click Retry.",
        );
      }
    } catch {
      setInstalled(false);
      setError("Unable to detect Lace provider.");
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    runDetection();
  }, []);

  const onConnect = async () => {
    setError(null);

    if (!installed) {
      setError("Lace provider not detected in this browser.");
      return;
    }

    setBusy(true);
    try {
      const ok = await connectLace();
      setConnected(ok);
      if (!ok) {
        setError("Unable to connect to Lace wallet.");
      }
    } catch (err) {
      setConnected(false);
      if (err instanceof Error && err.message === "LACE_TIMEOUT") {
        setError(
          "❌ Lace popup timed out. Make sure you CLICKED APPROVE in the Lace extension popup, then try again.",
        );
      } else if (err instanceof Error && err.message) {
        setError(`Wallet error: ${err.message}`);
      } else {
        setError("Wallet connection was rejected or failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        className="wallet"
        onClick={onConnect}
        type="button"
        disabled={busy || detecting}
      >
        {busy
          ? "Connecting..."
          : detecting
            ? "Detecting Lace..."
            : connected
              ? "✓ Lace Connected"
              : installed
                ? "Connect Lace Wallet"
                : "📦 Install Lace Wallet"}
      </button>
      {error && <p className="wallet-error">{error}</p>}
      {!installed && !detecting && (
        <button className="secondary" onClick={runDetection} type="button">
          Retry Detect
        </button>
      )}
    </div>
  );
}
