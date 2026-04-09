"use client";

import type {
  ConnectedAPI,
  InitialAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import { createWitnessProvider, hasRecord } from "./witnessProvider";
import managedArtifact from "../managed/contracts/patient_registry.managed.json";

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

function getConfiguredNetworkId(): string {
  return (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "undeployed")
    .trim()
    .toLowerCase();
}

function resolveWalletApi(): InitialAPI {
  if (typeof window === "undefined") {
    throw new Error("Wallet access is only available in the browser.");
  }

  const wallets = window.midnight ?? {};
  const keys = Object.keys(wallets);
  if (!keys.length) {
    throw new Error(
      "No Midnight wallet detected. Install Lace and enable Midnight support.",
    );
  }

  if (wallets.lace) {
    return wallets.lace;
  }

  const laceLike = keys.find((k) => k.toLowerCase().includes("lace"));
  if (laceLike) {
    return wallets[laceLike];
  }

  return wallets[keys[0]];
}

async function getConnectedApi(): Promise<ConnectedAPI> {
  if (connectedApiCache) {
    return connectedApiCache;
  }

  const initial = resolveWalletApi();
  const networkId = getConfiguredNetworkId();

  try {
    connectedApiCache = await initial.connect(networkId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "");
    const lower = message.toLowerCase();

    if (
      lower.includes("reject") ||
      lower.includes("denied") ||
      lower.includes("decline")
    ) {
      throw new Error(
        "Wallet connection rejected. Approve the wallet popup and try again.",
      );
    }

    throw new Error(
      message
        ? `Wallet connection failed: ${message}`
        : `Wallet connection failed on network \"${networkId}\". Ensure Lace is unlocked and on the same network.`,
    );
  }

  return connectedApiCache;
}

function assertCompiledArtifactReady(): void {
  const maybeStatus =
    managedArtifact && typeof managedArtifact === "object"
      ? (managedArtifact as Record<string, unknown>).status
      : undefined;

  if (maybeStatus === "placeholder") {
    throw new Error(
      "Contract artifact is still a placeholder. Run `npm run compile:contract`, deploy to preprod, and set NEXT_PUBLIC_CONTRACT_ADDRESS.",
    );
  }
}

export async function connectWallet(): Promise<WalletState> {
  const api = await getConnectedApi();
  const shielded = await api.getShieldedAddresses();
  const unshielded = await api.getUnshieldedAddress();
  const status = await api.getConnectionStatus();

  if (!shielded.shieldedAddress) {
    throw new Error("No shielded Midnight address found in connected wallet.");
  }

  return {
    shieldedAddress: shielded.shieldedAddress,
    unshieldedAddress: unshielded.unshieldedAddress,
    networkId: status.status === "connected" ? status.networkId : "unknown",
  };
}

export async function runProof(
  params: {
    required_vaccine: string;
    clinic_pubkey_hash: string;
  },
  onUpdate: (u: ProofUpdate) => void,
): Promise<LedgerState> {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress?.trim()) {
    throw new Error(
      "Missing contract address. Set NEXT_PUBLIC_CONTRACT_ADDRESS.",
    );
  }

  if (!hasRecord()) {
    throw new Error("No health record on this device. Visit /issue first.");
  }

  const api = await getConnectedApi();
  const cfg = await api.getConfiguration();

  // Keep witness provider creation explicit to match witness declarations.
  createWitnessProvider();
  assertCompiledArtifactReady();

  onUpdate({
    stage: "witness",
    pct: 20,
    message: "Wallet connected. Resolving witness inputs...",
  });

  await api.hintUsage([
    "getConfiguration",
    "getProvingProvider",
    "balanceUnsealedTransaction",
    "submitTransaction",
  ]);

  onUpdate({
    stage: "proving",
    pct: 45,
    message: "Preparing prover from wallet capabilities...",
  });
  // This proves wallet-side prover capability is available from the real SDK.
  // Full contract call submission requires non-placeholder compiled artifacts.
  await api.getProvingProvider({
    async getZKIR() {
      throw new Error(
        "Missing generated ZKIR key material. Compile contract artifacts before proving.",
      );
    },
    async getProverKey() {
      throw new Error(
        "Missing generated prover key material. Compile contract artifacts before proving.",
      );
    },
    async getVerifierKey() {
      throw new Error(
        "Missing generated verifier key material. Compile contract artifacts before proving.",
      );
    },
  });

  onUpdate({
    stage: "error",
    pct: 100,
    message:
      "Runtime is connected to wallet SDK, but proving/submission needs generated keys + deployed contract wiring.",
  });

  throw new Error(
    `Real contract submission is blocked until managed artifacts are generated and providers are wired for ${cfg.networkId}. Contract: ${contractAddress.trim()}`,
  );
}

export async function getLedgerState(
  contractAddress: string,
): Promise<LedgerState | null> {
  if (!contractAddress.trim()) {
    throw new Error(
      "Missing contract address. Set NEXT_PUBLIC_CONTRACT_ADDRESS.",
    );
  }

  const api = await getConnectedApi();
  const status = await api.getConnectionStatus();
  assertCompiledArtifactReady();

  if (status.status !== "connected") {
    throw new Error(
      "Wallet is disconnected. Reconnect and retry verification.",
    );
  }

  throw new Error(
    "Ledger lookup wiring requires generated managed artifacts plus a public-data provider binding for midnight-js-contracts.",
  );
}
