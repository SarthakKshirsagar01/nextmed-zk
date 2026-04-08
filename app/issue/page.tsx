"use client";

import { useState } from "react";
import {
  clearStoredProof,
  createAttestation,
  setStoredAttestation,
} from "../../lib/zk/proof";

export default function IssuePage() {
  const [patientRef, setPatientRef] = useState("demo-patient-001");
  const [providerPubkey, setProviderPubkey] = useState("did:midnight:clinic-a");
  const [vaccineCodes, setVaccineCodes] = useState("MMR,COVID19");
  const [issued, setIssued] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onIssue = async () => {
    setIssuing(true);
    setIssued(false);
    setError(null);

    try {
      const attestation = await createAttestation({
        patientRef,
        providerPubkey,
        vaccineCodes: vaccineCodes.split(","),
      });

      setStoredAttestation(attestation);
      clearStoredProof();
      setIssued(true);
    } catch {
      setError("Unable to issue attestation. Please try again.");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <section className="panel">
      <h2>Issuer Dashboard</h2>
      <p>
        Doctor signs a vaccination record and sends it directly to the patient
        wallet.
      </p>
      <label htmlFor="patient-ref">Patient Reference</label>
      <input
        id="patient-ref"
        value={patientRef}
        onChange={(event) => setPatientRef(event.target.value)}
      />

      <label htmlFor="provider-pubkey">Provider Public Key</label>
      <input
        id="provider-pubkey"
        value={providerPubkey}
        onChange={(event) => setProviderPubkey(event.target.value)}
      />

      <label htmlFor="vaccine-codes">Vaccine Codes (comma-separated)</label>
      <input
        id="vaccine-codes"
        value={vaccineCodes}
        onChange={(event) => setVaccineCodes(event.target.value)}
      />

      <button
        className="primary"
        onClick={onIssue}
        type="button"
        disabled={issuing}
      >
        {issuing ? "Issuing..." : "Issue Signed Attestation"}
      </button>
      {issued && (
        <p className="ok">
          Attestation issued locally and ready for proof generation.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
