"use client";

import type {
  ConnectedAPI,
  InitialAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import managedArtifact from "../managed/contracts/patient_registry.managed.json";
import { createWitnessProvider, hasRecord } from "./witnessProvider";
import { runScaffoldProof, type VaccinationProofParams } from "./zk/proof";

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI>;
  }
}

export interface WalletState {
  shieldedAddress:   string;
  unshieldedAddress: string;
  networkId:         string;
}

export interface LedgerState {
  is_eligible:     boolean;
  verified_at:     number;
  issuer_key_hash: string;
  nullifier:       string;
}

export type ProofStage =
  | "idle" | "witness" | "proving" | "submitting" | "confirmed" | "error";

export interface ProofUpdate {
  stage:   ProofStage;
  pct:     number;
  message: string;
}

// ── Module-level cache ───────────────────────────────────────
let connectedApiCache:    ConnectedAPI | null = null;
let scaffoldLedgerCache:  LedgerState  | null = null;

// ── Helpers ──────────────────────────────────────────────────

function getConfiguredNetworkId(): string {
  return (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "undeployed").trim().toLowerCase();
}

function getContractAddress(): string {
  return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
}

function artifactIsPlaceholder(): boolean {
  const s = managedArtifact && typeof managedArtifact === "object"
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
    throw new Error("No Midnight wallet detected. Install Lace and enable Midnight support.");
  }
  if (wallets.lace) return wallets.lace;
  const laceLike = keys.find(k => k.toLowerCase().includes("lace"));
  if (laceLike) return wallets[laceLike];
  return wallets[keys[0]];
}

async function getConnectedApi(): Promise<ConnectedAPI> {
  if (connectedApiCache) return connectedApiCache;

  const initial   = resolveWalletApi();
  const networkId = getConfiguredNetworkId();

  try {
    connectedApiCache = await initial.connect(networkId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "");
    const lower   = message.toLowerCase();
    if (lower.includes("reject") || lower.includes("denied") || lower.includes("decline")) {
      throw new Error("Wallet connection rejected. Approve the popup and try again.");
    }
    throw new Error(
      message
        ? `Wallet connection failed: ${message}`
        : `Wallet connection failed on network "${networkId}". Ensure Lace is unlocked.`
    );
  }

  return connectedApiCache;
}

// ── 1. Wallet connection ─────────────────────────────────────

export async function connectWallet(): Promise<WalletState> {
  const api       = await getConnectedApi();
  const shielded  = await api.getShieldedAddresses();
  const unshielded = await api.getUnshieldedAddress();
  const status    = await api.getConnectionStatus();

  if (!shielded.shieldedAddress) {
    throw new Error("No shielded Midnight address found in connected wallet.");
  }

  return {
    shieldedAddress:   shielded.shieldedAddress,
    unshieldedAddress: unshielded.unshieldedAddress,
    networkId: status.status === "connected" ? status.networkId : "unknown",
  };
}

// ── 2. Proof runner ──────────────────────────────────────────

export async function runProof(
  params:   { required_vaccine: string; clinic_pubkey_hash: string },
  onUpdate: (u: ProofUpdate) => void
): Promise<LedgerState> {

  if (!hasRecord()) {
    throw new Error("No health record on this device. Visit /issue first.");
  }

  // Connect wallet first so we have an active API handle
  const api = await getConnectedApi();

  onUpdate({ stage: "witness", pct: 20, message: "Wallet connected. Resolving witness inputs..." });

  // Keep real capability checks active even in scaffold mode
  await api.hintUsage([
    "getConfiguration",
    "getProvingProvider",
    "balanceUnsealedTransaction",
    "submitTransaction",
  ]);

  const proofParams: VaccinationProofParams = {
    required_vaccine:   params.required_vaccine,
    max_record_age:     31536000n,  // 1 year in seconds
    clinic_pubkey_hash: params.clinic_pubkey_hash,
  };

  if (shouldUseScaffoldFlow()) {
    // Routes through lib/zk/proof.ts which runs real witness validation
    const result = await runScaffoldProof(proofParams, onUpdate);
    const ledger: LedgerState = {
      is_eligible:     result.is_eligible,
      verified_at:     result.verified_at,
      issuer_key_hash: result.issuer_key_hash,
      nullifier:       result.nullifier,
    };
    scaffoldLedgerCache = ledger;
    return ledger;
  }

  // ── TODO: Real Midnight proof (activate after Phase 6 deploy) ──
  // import { runRealProof } from "./zk/proof";
  // const result = await runRealProof(api, proofParams, onUpdate);
  // scaffoldLedgerCache = result;
  // return result;
  // ───────────────────────────────────────────────────────────────

  const cfg = await api.getConfiguration();
  throw new Error(
    `Real contract wiring not active for network ${cfg.networkId}. ` +
    `Run compactc, deploy contract, then set NEXT_PUBLIC_CONTRACT_ADDRESS.`
  );
}

// ── 3. Ledger state reader ────────────────────────────────────

export async function getLedgerState(
  contractAddress: string
): Promise<LedgerState | null> {
  if (!contractAddress.trim()) {
    throw new Error("Missing contract address. Set NEXT_PUBLIC_CONTRACT_ADDRESS.");
  }

  const api    = await getConnectedApi();
  const status = await api.getConnectionStatus();

  if (status.status !== "connected") {
    throw new Error("Wallet is disconnected. Reconnect and retry.");
  }

  if (shouldUseScaffoldFlow()) {
    return scaffoldLedgerCache;
  }

  // TODO: real ledger query after deployment
  throw new Error("Ledger lookup requires compiled artifacts and a deployed contract address.");
}
