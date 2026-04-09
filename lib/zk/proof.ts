export type AttestationDraft = {
  patientRef: string;
  providerPubkey: string;
  vaccineCodes: string[];
};

export type StoredAttestation = AttestationDraft & {
  witnessHash: string;
  issuedAt: string;
};

export type ProofArtifact = {
  proof: string;
  commitmentHash: string;
  nullifier: string;
  isEligible: boolean;
};

export type VerifyResult = {
  valid: boolean;
  isEligible?: boolean;
  reason?: string;
};

const ATTESTATION_KEY = "nextmed.attestation";
const PROOF_KEY = "nextmed.proof";

async function sha256Hex(input: string): Promise<string> {
  const payload = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", payload);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeStorageGet<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function storageSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getStoredAttestation(): StoredAttestation | null {
  return safeStorageGet<StoredAttestation>(ATTESTATION_KEY);
}

export function setStoredAttestation(value: StoredAttestation): void {
  storageSet(ATTESTATION_KEY, value);
}

export function clearStoredAttestation(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ATTESTATION_KEY);
}

export function getStoredProof(): ProofArtifact | null {
  return safeStorageGet<ProofArtifact>(PROOF_KEY);
}

export function setStoredProof(value: ProofArtifact): void {
  storageSet(PROOF_KEY, value);
}

export function clearStoredProof(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PROOF_KEY);
}

export async function createAttestation(
  draft: AttestationDraft,
): Promise<StoredAttestation> {
  const normalizedCodes = draft.vaccineCodes
    .map((code) => code.trim())
    .filter((code) => code.length > 0);

  const material = JSON.stringify({
    patientRef: draft.patientRef.trim(),
    providerPubkey: draft.providerPubkey.trim(),
    vaccineCodes: normalizedCodes,
    issuedAt: new Date().toISOString(),
  });

  const witnessHash = await sha256Hex(material);

  return {
    patientRef: draft.patientRef.trim(),
    providerPubkey: draft.providerPubkey.trim(),
    vaccineCodes: normalizedCodes,
    witnessHash,
    issuedAt: new Date().toISOString(),
  };
}
