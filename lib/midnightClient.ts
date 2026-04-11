"use client";

import type {
  ConnectedAPI,
  InitialAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import managedArtifact from "../managed/contracts/patient_registry.managed.json";
import { hasRecord } from "./witnessProvider";
import { runScaffoldProof, type VaccinationProofParams } from "./zk/proof";

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

export interface WalletState {
  shieldedAddress: string;
  unshieldedAddress: string;
  networkId: string;
}

export interface LedgerState {
  is_eligible: boolean;
  verified_at: number;
  issuer_key_hash: string;
  nullifier: string;
}

export type ProofStage =
  | "idle"
  | "witness"
  | "proving"
  | "submitting"
  | "confirmed"
  | "error";

export interface ProofUpdate {
  stage: ProofStage;
  pct: number;
  message: string;
}

let connectedApiCache: ConnectedAPI | null = null;
let scaffoldLedgerCache: LedgerState | null = null;

function getContractAddress(): string {
  return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
}

function artifactIsPlaceholder(): boolean {
  const s =
    managedArtifact && typeof managedArtifact === "object"
      ? (managedArtifact as Record<string, unknown>).status
      : undefined;
  return s === "placeholder";
}

function shouldUseScaffoldFlow(): boolean {
  return artifactIsPlaceholder() || !getContractAddress();
}

function resolveWalletApi(): InitialAPI {
  if (typeof window === "undefined") {
    throw new Error("Wallet access is only available in the browser.");
  }
  const wallets = window.midnight ?? {};
  const keys = Object.keys(wallets);
  if (!keys.length) {
    throw new Error(
      "No Midnight wallet detected.\n\nInstall Lace from https://www.lace.io and enable Midnight.",
    );
  }
  if (wallets.lace) return wallets.lace;
  const laceLike = keys.find((k) => k.toLowerCase().includes("lace"));
  if (laceLike) return wallets[laceLike];
  return wallets[keys[0]];
}

// ── Core: try a list of network IDs until one works ───────────
// Lace wallets report different network IDs depending on their
// configuration state. We try the configured value first, then
// fall back through known valid IDs so the UI never breaks.

const NETWORK_CANDIDATES = [
  // Configured value comes first (from .env.local)
  ...(typeof process !== "undefined"
    ? [
        (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "undeployed")
          .trim()
          .toLowerCase(),
      ]
    : []),
  // Known valid Midnight network IDs — order matters, most common first
  "undeployed",
  "preprod",
  "standalone",
  "devnet",
  "testnet",
];

async function getConnectedApi(): Promise<ConnectedAPI> {
  if (connectedApiCache) return connectedApiCache;

  const initial = resolveWalletApi();

  // Deduplicate candidates while preserving order
  const seen = new Set<string>();
  const candidates = NETWORK_CANDIDATES.filter((n) => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  let lastError = "";

  for (const networkId of candidates) {
    try {
      connectedApiCache = await initial.connect(networkId);
      console.log(`[NextMed] Wallet connected on network: ${networkId}`);
      return connectedApiCache;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err ?? "");
      const lower = msg.toLowerCase();

      // User explicitly rejected — stop immediately, don't try other networks
      if (
        lower.includes("reject") ||
        lower.includes("denied") ||
        lower.includes("decline")
      ) {
        throw new Error(
          "Wallet connection rejected. Click the button again and approve the Lace popup.",
        );
      }

      // Network mismatch — try next candidate
      lastError = msg;
      continue;
    }
  }

  // All candidates exhausted
  throw new Error(
    `Could not connect wallet on any known network.\n\n` +
      `Last error: ${lastError}\n\n` +
      `Fix: Open Lace → Settings → ensure Midnight is enabled and a network is selected.`,
  );
}

// ── 1. Connect wallet ─────────────────────────────────────────

export async function connectWallet(): Promise<WalletState> {
  const api = await getConnectedApi();
  const shielded = await api.getShieldedAddresses();
  const unshielded = await api.getUnshieldedAddress();
  const status = await api.getConnectionStatus();

  if (!shielded.shieldedAddress) {
    throw new Error(
      "No shielded Midnight address found.\n" +
        "Make sure Midnight is set up in Lace (not just Cardano).",
    );
  }

  return {
    shieldedAddress: shielded.shieldedAddress,
    unshieldedAddress: unshielded.unshieldedAddress,
    networkId: status.status === "connected" ? status.networkId : "unknown",
  };
}

// ── 2. Run proof ──────────────────────────────────────────────

export async function runProof(
  params: { required_vaccine: string; clinic_pubkey_hash: string },
  onUpdate: (u: ProofUpdate) => void,
): Promise<LedgerState> {
  if (!hasRecord()) {
    throw new Error("No health record on this device. Visit /issue first.");
  }

  await getConnectedApi();

  onUpdate({
    stage: "witness",
    pct: 20,
    message: "Wallet connected. Resolving witness inputs...",
  });
  await delay(400);

  const proofParams: VaccinationProofParams = {
    required_vaccine: params.required_vaccine,
    max_record_age: 31536000n,
    clinic_pubkey_hash: params.clinic_pubkey_hash,
  };

  if (shouldUseScaffoldFlow()) {
    const result = await runScaffoldProof(proofParams, onUpdate);
    const ledger: LedgerState = {
      is_eligible: result.is_eligible,
      verified_at: result.verified_at,
      issuer_key_hash: result.issuer_key_hash,
      nullifier: result.nullifier,
    };
    scaffoldLedgerCache = ledger;
    return ledger;
  }

  // TODO: Real proof after compactc + deployment
  throw new Error(
    "Real contract wiring not active. Run compactc and deploy first.",
  );
}

// ── 3. Get ledger state ───────────────────────────────────────

export async function getLedgerState(
  contractAddress: string,
): Promise<LedgerState | null> {
  if (!contractAddress.trim()) return null;
  try {
    const api = await getConnectedApi();
    const status = await api.getConnectionStatus();
    if (status.status !== "connected") return null;
  } catch {
    return null;
  }

  if (shouldUseScaffoldFlow()) return scaffoldLedgerCache;
  return null;
}

// ── Also export resetConnection for debugging ─────────────────
export function resetWalletConnection(): void {
  connectedApiCache = null;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
