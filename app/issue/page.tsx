"use client";

import { useState } from "react";

export default function IssuePage() {
  const [issued, setIssued] = useState(false);

  return (
    <section className="panel">
      <h2>Issuer Dashboard</h2>
      <p>
        Doctor signs a vaccination record and sends it directly to the patient
        wallet.
      </p>
      <button className="primary" onClick={() => setIssued(true)} type="button">
        Issue Signed Attestation
      </button>
      {issued && (
        <p className="ok">
          Attestation issued. No patient record stored on app servers.
        </p>
      )}
    </section>
  );
}
