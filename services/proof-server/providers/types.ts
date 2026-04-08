export interface ProofRequest {
  witnessHash: string;
  providerPubkey: string;
  vaccineCodes: string[];
}

export interface ProofResponse {
  proof: string;
  commitmentHash: string;
  nullifier: string;
  isEligible: boolean;
}

export interface VerifyRequest {
  proof: string;
  nullifier: string;
  commitmentHash?: string;
}

export interface VerifyResponse {
  valid: boolean;
  isEligible?: boolean;
  reason?: string;
}

export interface ProofProvider {
  mode: string;
  prove(input: ProofRequest): Promise<ProofResponse>;
  verify(input: VerifyRequest): Promise<VerifyResponse>;
}
