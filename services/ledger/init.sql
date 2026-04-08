-- Vaccination Proof Ledger Schema

CREATE TABLE vaccination_nullifiers (
  id SERIAL PRIMARY KEY,
  nullifier VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vaccination_verifications (
  id SERIAL PRIMARY KEY,
  nullifier VARCHAR(255) NOT NULL,
  verification_hash VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_attestations (
  id SERIAL PRIMARY KEY,
  provider_pubkey VARCHAR(255) NOT NULL,
  vaccine_codes TEXT[] NOT NULL,
  commitment_hash VARCHAR(255) NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX idx_nullifier ON vaccination_nullifiers(nullifier);
CREATE INDEX idx_verification_nullifier ON vaccination_verifications(nullifier);
CREATE INDEX idx_commitment_hash ON patient_attestations(commitment_hash);
