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

export type ProofProviderMode = "mock-http" | "midnight-http";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_PROOF_API_URL || "http://localhost:9090";
const MIDNIGHT_API_BASE_URL =
  process.env.NEXT_PUBLIC_MIDNIGHT_API_URL || API_BASE_URL;
const PROOF_PROVIDER_MODE =
  (process.env.NEXT_PUBLIC_PROOF_PROVIDER as ProofProviderMode | undefined) ||
  "mock-http";
const MOCK_PROVE_PATH = process.env.NEXT_PUBLIC_PROOF_PROVE_PATH || "/prove";
const MOCK_VERIFY_PATH = process.env.NEXT_PUBLIC_PROOF_VERIFY_PATH || "/verify";
const MIDNIGHT_PROVE_PATH =
  process.env.NEXT_PUBLIC_MIDNIGHT_PROVE_PATH || "/prove";
const MIDNIGHT_VERIFY_PATH =
  process.env.NEXT_PUBLIC_MIDNIGHT_VERIFY_PATH || "/verify";
const ATTESTATION_KEY = "nextmed.attestation";
const PROOF_KEY = "nextmed.proof";

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getProofEndpoints(): {
  mode: ProofProviderMode;
  proveUrl: string;
  verifyUrl: string;
} {
  if (PROOF_PROVIDER_MODE === "midnight-http") {
    return {
      mode: PROOF_PROVIDER_MODE,
      proveUrl: joinUrl(MIDNIGHT_API_BASE_URL, MIDNIGHT_PROVE_PATH),
      verifyUrl: joinUrl(MIDNIGHT_API_BASE_URL, MIDNIGHT_VERIFY_PATH),
    };
  }

  return {
    mode: "mock-http",
    proveUrl: joinUrl(API_BASE_URL, MOCK_PROVE_PATH),
    verifyUrl: joinUrl(API_BASE_URL, MOCK_VERIFY_PATH),
  };
}

export function getProofRuntimeConfig(): {
  mode: ProofProviderMode;
  apiBaseUrl: string;
} {
  const endpoints = getProofEndpoints();
  const apiBaseUrl =
    endpoints.mode === "midnight-http" ? MIDNIGHT_API_BASE_URL : API_BASE_URL;

  return {
    mode: endpoints.mode,
    apiBaseUrl,
  };
}

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

export async function requestProof(
  attestation: StoredAttestation,
): Promise<ProofArtifact> {
  const { mode, proveUrl } = getProofEndpoints();

  const response = await fetch(proveUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      witnessHash: attestation.witnessHash,
      providerPubkey: attestation.providerPubkey,
      vaccineCodes: attestation.vaccineCodes,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Proof generation failed (${mode})`);
  }

  const payload = (await response.json()) as ProofArtifact;
  return payload;
}

export async function verifyProof(
  artifact: ProofArtifact,
): Promise<VerifyResult> {
  const { mode, verifyUrl } = getProofEndpoints();

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      proof: artifact.proof,
      nullifier: artifact.nullifier,
      commitmentHash: artifact.commitmentHash,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Verification failed (${mode})`);
  }

  return (await response.json()) as VerifyResult;
}
