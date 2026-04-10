"use client";

import type {
  ConnectedAPI,
  InitialAPI,
} from "@midnight-ntwrk/dapp-connector-api";
import managedArtifact from "../managed/contracts/patient_registry.managed.json";
import { createWitnessProvider, hasRecord } from "./witnessProvider";

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

function getConfiguredNetworkId(): string {
  return (process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK ?? "undeployed")
    .trim()
    .toLowerCase();
}

function getContractAddress(): string {
  return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();
}

function artifactIsPlaceholder(): boolean {
  const maybeStatus =
    managedArtifact && typeof managedArtifact === "object"
      ? (managedArtifact as Record<string, unknown>).status
      : undefined;
  return maybeStatus === "placeholder";
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
        : `Wallet connection failed on network "${networkId}". Ensure Lace is unlocked and on the same network.`,
    );
  }

  return connectedApiCache;
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

function buildScaffoldLedgerState(params: {
  clinic_pubkey_hash: string;
}): LedgerState {
  const witness = createWitnessProvider();
  return {
    is_eligible: true,
    verified_at: Number(witness.current_timestamp()),
    issuer_key_hash: params.clinic_pubkey_hash,
    nullifier: witness.proof_nullifier(),
  };
}

export async function runProof(
  params: {
    required_vaccine: string;
    clinic_pubkey_hash: string;
  },
  onUpdate: (u: ProofUpdate) => void,
): Promise<LedgerState> {
  if (!hasRecord()) {
    throw new Error("No health record on this device. Visit /issue first.");
  }

  const api = await getConnectedApi();

  onUpdate({
    stage: "witness",
    pct: 20,
    message: "Wallet connected. Resolving witness inputs...",
  });

  // This keeps real wallet capability checks active today.
  await api.hintUsage([
    "getConfiguration",
    "getProvingProvider",
    "balanceUnsealedTransaction",
    "submitTransaction",
  ]);

  onUpdate({
    stage: "proving",
    pct: 55,
    message: shouldUseScaffoldFlow()
      ? "Scaffold mode: simulating proof output for UI flow."
      : "Preparing real proof call wiring...",
  });

  if (shouldUseScaffoldFlow()) {
    const simulated = buildScaffoldLedgerState(params);
    scaffoldLedgerCache = simulated;

    onUpdate({
      stage: "submitting",
      pct: 80,
      message:
        "Scaffold mode: skipping chain submission until artifacts are generated.",
    });

    onUpdate({
      stage: "confirmed",
      pct: 100,
      message:
        "Scaffold proof completed. Generate managed artifacts and contract wiring to enable real on-chain submission.",
    });

    return simulated;
  }

  // TODO(real Midnight): Replace scaffold branch with midnight-js-contracts call.
  // Suggested swap point:
  // 1) Build contract instance with managed artifacts + providers.
  // 2) Bind createWitnessProvider() as witness resolver.
  // 3) Invoke prove_vaccination_eligibility(required_vaccine, clinic_pubkey_hash).
  // 4) Submit transaction and map disclosed ledger fields into LedgerState.
  const cfg = await api.getConfiguration();
  throw new Error(
    `Real contract submission is not wired yet for network ${cfg.networkId}. Swap TODO block in lib/midnightClient.ts to enable live proving.`,
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
  if (status.status !== "connected") {
    throw new Error(
      "Wallet is disconnected. Reconnect and retry verification.",
    );
  }

  if (shouldUseScaffoldFlow()) {
    return scaffoldLedgerCache;
  }

  // TODO(real Midnight): Query contract public state via public-data provider.
  // Keep this function signature stable for app/verify/page.tsx.
  throw new Error(
    "Ledger lookup wiring requires generated managed artifacts plus a public-data provider binding for midnight-js-contracts.",
  );
}
