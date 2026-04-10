import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  local_health_record(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, string];
  clinic_signature(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, string];
  claimed_vaccine_id(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, string];
  expected_issuer_hash(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, string];
  current_timestamp(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  proof_nonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, string];
}

export type ImpureCircuits<PS> = {
  proveVaccination(context: __compactRuntime.CircuitContext<PS>,
                   required_vaccine_0: string,
                   max_record_age_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveInsuranceCoverage(context: __compactRuntime.CircuitContext<PS>,
                         required_procedure_code_0: string): __compactRuntime.CircuitResults<PS, []>;
  revokeEligibility(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  proveVaccination(context: __compactRuntime.CircuitContext<PS>,
                   required_vaccine_0: string,
                   max_record_age_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveInsuranceCoverage(context: __compactRuntime.CircuitContext<PS>,
                         required_procedure_code_0: string): __compactRuntime.CircuitResults<PS, []>;
  revokeEligibility(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  proveVaccination(context: __compactRuntime.CircuitContext<PS>,
                   required_vaccine_0: string,
                   max_record_age_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  proveInsuranceCoverage(context: __compactRuntime.CircuitContext<PS>,
                         required_procedure_code_0: string): __compactRuntime.CircuitResults<PS, []>;
  revokeEligibility(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly is_eligible: boolean;
  readonly verified_at: bigint;
  readonly issuer_key_hash: string;
  readonly nullifier: string;
  readonly nullifier_used: boolean;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
