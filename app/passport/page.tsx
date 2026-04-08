"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PassportPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const generateProof = () => {
    setGenerating(true);
    setDone(false);
    window.setTimeout(() => {
      setGenerating(false);
      setDone(true);
    }, 1800);
  };

  return (
    <section className="panel">
      <h2>Patient Vault</h2>
      <p>Data stays local. Proofs go to Midnight.</p>
      <button className="primary" onClick={generateProof} type="button">
        {generating ? "Generating Proof..." : "Generate Eligibility Proof"}
      </button>
      {done && (
        <p className="ok">
          Proof ready. You can now present it for verification.
        </p>
      )}
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
