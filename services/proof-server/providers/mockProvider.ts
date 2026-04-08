import {
  type ProofProvider,
  type ProofRequest,
  type ProofResponse,
  type VerifyRequest,
  type VerifyResponse,
} from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class MockProofProvider implements ProofProvider {
  mode = "mock";

  async prove(input: ProofRequest): Promise<ProofResponse> {
    const delayMs = Math.random() * 1000 + 500;
    await delay(delayMs);

    const proof = `0x${Buffer.from(input.witnessHash).toString("hex").slice(0, 64)}`;
    const commitmentHash = `0x${Buffer.from(`commitment:${input.witnessHash}`)
      .toString("hex")
      .slice(0, 64)}`;
    const nullifier = `0xnulls_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

    return {
      proof,
      commitmentHash,
      nullifier,
      isEligible: true,
    };
  }

  async verify(input: VerifyRequest): Promise<VerifyResponse> {
    const delayMs = Math.random() * 1000 + 500;
    await delay(delayMs);

    if (!input.proof.startsWith("0x")) {
      return {
        valid: false,
        reason: "Malformed proof",
      };
    }

    return {
      valid: true,
      isEligible: true,
    };
  }
}
