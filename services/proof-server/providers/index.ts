import { MidnightHttpProofProvider } from "./midnightHttpProvider";
import { MockProofProvider } from "./mockProvider";
import { type ProofProvider } from "./types";

const PROOF_BACKEND_MODE = process.env.PROOF_BACKEND_MODE || "mock";

function normalizeWrapperMode(
  value: string | undefined,
): "raw" | "data" | "input" | "payload" {
  if (value === "data" || value === "input" || value === "payload") {
    return value;
  }

  return "raw";
}

export function createProofProvider(): ProofProvider {
  if (PROOF_BACKEND_MODE === "midnight-http") {
    return new MidnightHttpProofProvider({
      baseUrl: process.env.MIDNIGHT_BRIDGE_URL || "http://localhost:9091",
      provePath: process.env.MIDNIGHT_BRIDGE_PROVE_PATH || "/prove",
      verifyPath: process.env.MIDNIGHT_BRIDGE_VERIFY_PATH || "/verify",
      apiKey: process.env.MIDNIGHT_BRIDGE_API_KEY,
      apiKeyHeaderName:
        process.env.MIDNIGHT_BRIDGE_API_KEY_HEADER || "Authorization",
      apiKeyPrefix: process.env.MIDNIGHT_BRIDGE_API_KEY_PREFIX || "Bearer",
      requestWrapper: normalizeWrapperMode(
        process.env.MIDNIGHT_BRIDGE_REQUEST_WRAPPER,
      ),
      timeoutMs: Number(process.env.MIDNIGHT_BRIDGE_TIMEOUT_MS || 15000),
    });
  }

  return new MockProofProvider();
}
