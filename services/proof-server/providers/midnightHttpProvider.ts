import {
  type ProofProvider,
  type ProofRequest,
  type ProofResponse,
  type VerifyRequest,
  type VerifyResponse,
} from "./types";

type MidnightHttpConfig = {
  baseUrl: string;
  provePath: string;
  verifyPath: string;
  apiKey?: string;
  apiKeyHeaderName: string;
  apiKeyPrefix: string;
  requestWrapper: "raw" | "data" | "input" | "payload";
  timeoutMs: number;
};

type UnknownRecord = Record<string, unknown>;

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function postJson<TResponse>(
  url: string,
  body: unknown,
  config: MidnightHttpConfig,
): Promise<TResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, config.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.apiKey) {
      const rawPrefix = config.apiKeyPrefix.trim();
      const formattedPrefix = rawPrefix.length > 0 ? `${rawPrefix} ` : "";
      headers[config.apiKeyHeaderName] = `${formattedPrefix}${config.apiKey}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bridge request failed with status ${response.status}`);
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timer);
  }
}

function toRecord(value: unknown): UnknownRecord {
  if (typeof value === "object" && value !== null) {
    return value as UnknownRecord;
  }

  throw new Error("Invalid bridge response: expected JSON object");
}

function nestedContainer(payload: UnknownRecord): UnknownRecord {
  const direct = payload as UnknownRecord;
  const fromData = direct.data;
  if (typeof fromData === "object" && fromData !== null) {
    return fromData as UnknownRecord;
  }

  const fromResult = direct.result;
  if (typeof fromResult === "object" && fromResult !== null) {
    return fromResult as UnknownRecord;
  }

  return direct;
}

function readString(obj: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function readBoolean(obj: UnknownRecord, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function wrapRequest(
  body: ProofRequest | VerifyRequest,
  wrapper: MidnightHttpConfig["requestWrapper"],
): unknown {
  if (wrapper === "data") {
    return { data: body };
  }

  if (wrapper === "input") {
    return { input: body };
  }

  if (wrapper === "payload") {
    return { payload: body };
  }

  return body;
}

function normalizeProofResponse(payload: unknown): ProofResponse {
  const root = nestedContainer(toRecord(payload));

  const proof = readString(root, ["proof", "proofHex", "proof_hex"]);
  const commitmentHash = readString(root, [
    "commitmentHash",
    "commitment",
    "commitment_hash",
  ]);
  const nullifier = readString(root, [
    "nullifier",
    "nullifierHash",
    "nullifier_hash",
  ]);
  const isEligible = readBoolean(root, ["isEligible", "eligible"]);

  if (!proof || !commitmentHash || !nullifier) {
    throw new Error("Invalid bridge prove response shape");
  }

  return {
    proof,
    commitmentHash,
    nullifier,
    isEligible: isEligible ?? true,
  };
}

function normalizeVerifyResponse(payload: unknown): VerifyResponse {
  const root = nestedContainer(toRecord(payload));

  const valid = readBoolean(root, ["valid", "isValid"]);
  const isEligible = readBoolean(root, ["isEligible", "eligible"]);
  const reason = readString(root, ["reason", "error", "message"]);

  if (typeof valid !== "boolean") {
    throw new Error("Invalid bridge verify response shape");
  }

  return {
    valid,
    isEligible,
    reason,
  };
}

export class MidnightHttpProofProvider implements ProofProvider {
  mode = "midnight-http";
  private readonly config: MidnightHttpConfig;

  constructor(config: MidnightHttpConfig) {
    this.config = config;
  }

  async prove(input: ProofRequest): Promise<ProofResponse> {
    const url = joinUrl(this.config.baseUrl, this.config.provePath);
    const wrapped = wrapRequest(input, this.config.requestWrapper);
    const payload = await postJson<unknown>(url, wrapped, this.config);
    return normalizeProofResponse(payload);
  }

  async verify(input: VerifyRequest): Promise<VerifyResponse> {
    const url = joinUrl(this.config.baseUrl, this.config.verifyPath);
    const wrapped = wrapRequest(input, this.config.requestWrapper);
    const payload = await postJson<unknown>(url, wrapped, this.config);
    return normalizeVerifyResponse(payload);
  }
}
