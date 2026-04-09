"use client";

import { useState } from "react";
import { clearStoredProof } from "../../lib/zk/proof";
import {
  createDemoRecord,
  storeRecord,
  type SignedHealthRecord,
} from "../../lib/witnessProvider";

const VACCINES = ["COVID-19", "MMR", "Hepatitis B", "Polio"];

export default function IssuePage() {
  const [selectedVaccine, setSelectedVaccine] = useState("COVID-19");
  const [issued, setIssued] = useState<SignedHealthRecord | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onIssue = async () => {
    setIssuing(true);
    setError(null);
    setIssued(null);

    try {
      const record = createDemoRecord(selectedVaccine);
      storeRecord(record);
      clearStoredProof();
      setIssued(record);
    } catch {
      setError("Unable to issue credential. Please try again.");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <section className="panel">
      <h2>Issuer Dashboard</h2>
      <p>
        Simulate clinic issuance by writing a signed health credential to local
        device storage.
      </p>

      <label htmlFor="vaccine">Vaccine</label>
      <select
        id="vaccine"
        value={selectedVaccine}
        onChange={(event) => setSelectedVaccine(event.target.value)}
        style={{
          width: "100%",
          border: "1px solid var(--line)",
          borderRadius: "10px",
          padding: "0.6rem 0.7rem",
          fontSize: "0.95rem",
          background: "#fff",
          color: "var(--ink)",
        }}
      >
        {VACCINES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        className="primary"
        onClick={onIssue}
        type="button"
        disabled={issuing}
      >
        {issuing ? "Issuing..." : "Issue Credential to Patient Device"}
      </button>

      {issued && (
        <div className="timeline">
          <p className="ok">Credential issued locally.</p>
          <ul>
            <li>Patient ID: {issued.record.patient_id}</li>
            <li>Vaccine: {issued.record.vaccinations[0]?.vaccine_name}</li>
            <li>Clinic hash: {issued.clinic_pubkey_hash}</li>
          </ul>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  );
}
