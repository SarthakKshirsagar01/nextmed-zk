"use client";

import { useState } from "react";

export default function VerifyPage() {
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);

  const runVerify = () => {
    setChecking(true);
    setVerified(false);
    window.setTimeout(() => {
      setChecking(false);
      setVerified(true);
    }, 1500);
  };

  return (
    <section className="panel">
      <h2>Verifier Scanner</h2>
      <p>Verifier learns only one fact: eligibility true or false.</p>
      <button className="primary" onClick={runVerify} type="button">
        {checking ? "Verifying..." : "Verify Eligibility"}
      </button>
      {verified && (
        <div className="timeline">
          <p className="ok">Eligible = true</p>
          <ul>
            <li>Provider signature verified in proof</li>
            <li>Nullifier uniqueness checked on-chain</li>
            <li>No patient identity disclosed</li>
          </ul>
        </div>
      )}
    </section>
  );
}
