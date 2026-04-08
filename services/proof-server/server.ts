import express, { Request, Response } from "express";
import { Pool } from "pg";
import { createProofProvider } from "./providers";
import { type ProofRequest } from "./providers/types";

const app = express();
const port = Number(process.env.PORT || 9090);
const provider = createProofProvider();

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
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    providerMode: provider.mode,
  });
});

// Proof generation endpoint
app.post("/prove", async (req: Request, res: Response) => {
  const proofReq = req.body as ProofRequest;

  if (!proofReq.witnessHash || !proofReq.providerPubkey) {
    res.status(400).json({ error: "Missing witnessHash or providerPubkey" });
    return;
  }

  try {
    const response = await provider.prove(proofReq);

    // Record nullifier in ledger to prevent re-use
    await pool.query(
      "INSERT INTO vaccination_nullifiers (nullifier, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING",
      [response.nullifier],
    );

    res.json(response);
  } catch (err) {
    console.error("Proof generation error:", err);
    res
      .status(500)
      .json({ error: `Proof generation failed (${provider.mode})` });
  }
});

// Proof verification endpoint
app.post("/verify", async (req: Request, res: Response) => {
  const { proof, nullifier, commitmentHash } = req.body;

  if (!proof || !nullifier) {
    res.status(400).json({ error: "Missing proof or nullifier" });
    return;
  }

  try {
    // Check if nullifier was already used (replay prevention)
    const result = await pool.query(
      "SELECT verified_at FROM vaccination_verifications WHERE nullifier = $1",
      [nullifier],
    );

    if (result.rows.length > 0) {
      res.json({ valid: false, reason: "Nullifier already used" });
      return;
    }

    const providerVerify = await provider.verify({
      proof,
      nullifier,
      commitmentHash,
    });

    if (!providerVerify.valid) {
      res.json(providerVerify);
      return;
    }

    // Record verification
    await pool.query(
      "INSERT INTO vaccination_verifications (nullifier, verification_hash, verified_at) VALUES ($1, $2, NOW())",
      [nullifier, proof],
    );

    res.json(providerVerify);
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: `Verification failed (${provider.mode})` });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NextMed Proof Server running on port ${port}`);
  console.log(`Provider mode: ${provider.mode}`);
  console.log("Endpoints:");
  console.log(`  GET  http://localhost:${port}/health`);
  console.log(`  POST http://localhost:${port}/prove`);
  console.log(`  POST http://localhost:${port}/verify`);
});
