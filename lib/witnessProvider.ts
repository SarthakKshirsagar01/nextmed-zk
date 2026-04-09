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

// ---- Storage helpers ----------------------------------------

export function storeRecord(signed: SignedHealthRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECORD_KEY, JSON.stringify(signed));
}

export function getRecord(): SignedHealthRecord | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(RECORD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignedHealthRecord;
  } catch {
    return null;
  }
}

export function hasRecord(): boolean {
  return getRecord() !== null;
}

export function clearRecord(): void {
  if (typeof window === "undefined") return;
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

export function createWitnessProvider() {
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

    // witness current_timestamp(): Field
    current_timestamp: (): bigint => {
      return BigInt(Math.floor(Date.now() / 1000));
    },

    // witness proof_nullifier(): Opaque<"string">
    proof_nullifier: (): string => {
      return crypto.randomUUID();
    },
  };
}
