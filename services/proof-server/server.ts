import express, { Request, Response } from "express";
import { Pool } from "pg";

interface ProofRequest {
  witnessHash: string;
  providerPubkey: string;
  vaccineCodes: string[];
}

interface ProofResponse {
  proof: string;
  commitmentHash: string;
  nullifier: string;
  isEligible: boolean;
}

const app = express();
const port = Number(process.env.PORT || 9090);

// PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || "ledger",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "midnight_ledger",
  user: process.env.DB_USER || "prover",
  password: process.env.DB_PASSWORD || "prover_secret",
});

app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Proof generation endpoint (mock)
app.post("/prove", async (req: Request, res: Response) => {
  const proofReq = req.body as ProofRequest;

  if (!proofReq.witnessHash || !proofReq.providerPubkey) {
    res.status(400).json({ error: "Missing witnessHash or providerPubkey" });
    return;
  }

  try {
    // Simulate proof generation (1-2s)
    const delayMs = Math.random() * 1000 + 500;
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Generate mock proof artifacts
    const proof = `0x${Buffer.from(proofReq.witnessHash).toString("hex").slice(0, 64)}`;
    const commitmentHash = `0x${Buffer.from(
      `commitment:${proofReq.witnessHash}`,
    )
      .toString("hex")
      .slice(0, 64)}`;
    const nullifier = `0xnulls_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

    // Record nullifier in ledger to prevent re-use
    await pool.query(
      "INSERT INTO vaccination_nullifiers (nullifier, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING",
      [nullifier],
    );

    const response: ProofResponse = {
      proof,
      commitmentHash,
      nullifier,
      isEligible: true,
    };

    res.json(response);
  } catch (err) {
    console.error("Proof generation error:", err);
    res.status(500).json({ error: "Proof generation failed" });
  }
});

// Proof verification endpoint (mock)
app.post("/verify", async (req: Request, res: Response) => {
  const { proof, nullifier, commitmentHash } = req.body;

  if (!proof || !nullifier) {
    res.status(400).json({ error: "Missing proof or nullifier" });
    return;
  }

  try {
    // Simulate verification (0.5-1.5s)
    const delayMs = Math.random() * 1000 + 500;
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // Check if nullifier was already used (replay prevention)
    const result = await pool.query(
      "SELECT verified_at FROM vaccination_verifications WHERE nullifier = $1",
      [nullifier],
    );

    if (result.rows.length > 0) {
      res.json({ valid: false, reason: "Nullifier already used" });
      return;
    }

    // Record verification
    await pool.query(
      "INSERT INTO vaccination_verifications (nullifier, verification_hash, verified_at) VALUES ($1, $2, NOW())",
      [nullifier, proof],
    );

    res.json({ valid: true, isEligible: true });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NextMed Mock Proof Server running on port ${port}`);
  console.log("Endpoints:");
  console.log(`  GET  http://localhost:${port}/health`);
  console.log(`  POST http://localhost:${port}/prove`);
  console.log(`  POST http://localhost:${port}/verify`);
});
