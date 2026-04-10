"use client";

// ============================================================
// lib/witnessProvider.ts
//
// Implements the 4 witness functions declared in patient_registry.compact.
// These run ONLY in the browser. Data never leaves this device.
// The Midnight JS SDK calls these automatically before proof generation.
// ============================================================

const RECORD_KEY = "nextmed:signed_record";
const PREFS_KEY = "nextmed:disclosure_prefs";

// ---- Types --------------------------------------------------

export interface SignedHealthRecord {
  record: {
    patient_id: string;
    issued_at: number;
    vaccinations: {
      vaccine_id: string;
      vaccine_name: string;
      batch_number: string;
      date_administered: number;
    }[];
    date_of_birth: number;
  };
  clinic_signature: string;
  clinic_pubkey_hash: string;
}

export interface ContractWitnessProvider {
  local_health_record: () => string;
  clinic_signature: () => string;
  claimed_vaccine_id: () => string;
  expected_issuer_hash: () => string;
  current_timestamp: () => bigint;
  proof_nonce: () => string;
  proof_nullifier: () => string;
}

function hasBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function isSignedHealthRecord(value: unknown): value is SignedHealthRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SignedHealthRecord>;
  return (
    typeof candidate.clinic_signature === "string" &&
    typeof candidate.clinic_pubkey_hash === "string" &&
    !!candidate.record &&
    typeof candidate.record === "object"
  );
}

// ---- Storage helpers ----------------------------------------

export function storeRecord(signed: SignedHealthRecord): void {
  if (!hasBrowserStorage()) return;
  localStorage.setItem(RECORD_KEY, JSON.stringify(signed));
}

export function getRecord(): SignedHealthRecord | null {
  if (!hasBrowserStorage()) return null;
  const raw = localStorage.getItem(RECORD_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isSignedHealthRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasRecord(): boolean {
  return getRecord() !== null;
}

export function clearRecord(): void {
  if (!hasBrowserStorage()) return;
  localStorage.removeItem(RECORD_KEY);
  localStorage.removeItem(PREFS_KEY);
}

// ---- Demo helper — creates a signed-looking record locally --
// Used in /issue page during development (no real clinic server needed yet)

export function createDemoRecord(vaccineName: string): SignedHealthRecord {
  return {
    record: {
      patient_id: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      issued_at: Math.floor(Date.now() / 1000),
      vaccinations: [
        {
          vaccine_id: vaccineName.toUpperCase().replace(/\s/g, "-"),
          vaccine_name: vaccineName,
          batch_number: `BATCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          date_administered: Math.floor(Date.now() / 1000) - 86400 * 30,
        },
      ],
      date_of_birth: Math.floor(new Date("1990-01-01").getTime() / 1000),
    },
    // Demo signature; replace with real clinic-signed bytes in production.
    clinic_signature: Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0"),
    ).join(""),
    clinic_pubkey_hash: "0xdemo_clinic_key_hash_replace_with_real",
  };
}

// ---- Witness provider ---------------------------------------
// Returned object matches the 4 witness declarations in patient_registry.compact

export function createWitnessProvider(): ContractWitnessProvider {
  return {
    // witness local_health_record(): Opaque<"string">
    local_health_record: (): string => {
      const rec = getRecord();
      if (!rec)
        throw new Error(
          "No health record found on this device. Visit /issue to get one from your clinic.",
        );
      return JSON.stringify(rec.record);
    },

    // witness clinic_signature(): Opaque<"string">
    clinic_signature: (): string => {
      const rec = getRecord();
      if (!rec) throw new Error("No health record found.");
      return rec.clinic_signature;
    },

    // witness claimed_vaccine_id(): Opaque<"string">
    claimed_vaccine_id: (): string => {
      const rec = getRecord();
      const firstVaccine = rec?.record?.vaccinations?.[0];
      if (!firstVaccine?.vaccine_id) {
        throw new Error("No vaccination record found.");
      }
      return firstVaccine.vaccine_id;
    },

    // witness expected_issuer_hash(): Opaque<"string">
    expected_issuer_hash: (): string => {
      const rec = getRecord();
      if (!rec?.clinic_pubkey_hash) {
        throw new Error("Issuer hash is missing from the stored credential.");
      }
      return rec.clinic_pubkey_hash;
    },

    // witness current_timestamp(): Field
    current_timestamp: (): bigint => {
      return BigInt(Math.floor(Date.now() / 1000));
    },

    // witness proof_nonce(): Opaque<"string">
    proof_nonce: (): string => {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        return crypto.randomUUID();
      }

      return `fallback-nullifier-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    },

    // Backward-compatible alias used by existing scaffold client code.
    proof_nullifier: (): string => {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        return crypto.randomUUID();
      }

      return `fallback-nullifier-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    },
  };
}
