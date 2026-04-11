// deploy.mjs
// Deploy patient_registry.compact to Midnight Preprod.
//
// Prerequisites:
//   1. `compact compile` has been run — managed/ contains compiled artifacts
//   2. Docker proof server is running: docker-compose up midnight-proof-server
//   3. Lace wallet is connected with funded tNight/DUST tokens
//
// This script is designed to be called from the frontend via
// the Midnight DApp connector, not as a standalone CLI script.
// The actual deployment happens through the browser with Lace wallet signing.
//
// For hackathon submission: the contract is fully compiled and ready
// to deploy. The managed/ directory contains all required artifacts:
//   - managed/contract/index.js     (TypeScript bindings)
//   - managed/keys/*.prover         (Proving keys)
//   - managed/keys/*.verifier       (Verification keys)
//   - managed/zkir/*.zkir           (ZK circuits)

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────

const PREPROD_NODE_URL = "https://rpc.midnight-preprod.midnight.global";
const PREPROD_INDEXER_URL =
  "https://indexer.midnight-preprod.midnight.global/api/v1/graphql";
const PROOF_SERVER_URL = "http://localhost:6300";
const MANAGED_DIR = join(__dirname, "..", "managed");
const CONTRACT_NAME = "patient_registry";

// ── Main deploy ───────────────────────────────────────────────

async function deploy() {
  console.log("🚀 NextMed Contract Deployment");
  console.log("   Network:      Midnight Preprod");
  console.log("   Node:        ", PREPROD_NODE_URL);
  console.log("   Indexer:     ", PREPROD_INDEXER_URL);
  console.log("   Proof Server:", PROOF_SERVER_URL);
  console.log("");

  // Step 1: Verify compiled artifacts exist
  console.log("📦 Verifying compiled artifacts...");

  const requiredFiles = [
    "contract/index.js",
    "contract/index.d.ts",
    "keys/proveVaccination.prover",
    "keys/proveVaccination.verifier",
    "keys/proveInsuranceCoverage.prover",
    "keys/proveInsuranceCoverage.verifier",
    "keys/revokeEligibility.prover",
    "keys/revokeEligibility.verifier",
    "compiler/contract-info.json",
  ];

  for (const file of requiredFiles) {
    try {
      readFileSync(join(MANAGED_DIR, file));
      console.log(`   ✓ ${file}`);
    } catch {
      console.error(`   ❌ Missing: ${file}`);
      console.error(
        "   Run: compact compile -- pkgs/contract/src/patient_registry.compact managed/",
      );
      process.exit(1);
    }
  }

  // Step 2: Check Proof Server is running
  console.log("\n🔍 Checking Proof Server...");
  try {
    const res = await fetch(`${PROOF_SERVER_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log("   ✓ Proof Server is healthy:", data.status);
  } catch (err) {
    console.error("❌ Proof Server not running.");
    console.error("   Start it with: docker-compose up midnight-proof-server");
    console.error(`   Expected at: ${PROOF_SERVER_URL}`);
    process.exit(1);
  }

  // Step 3: Load contract artifacts
  console.log("\n📡 Loading contract artifacts...");

  const contractInfo = JSON.parse(
    readFileSync(join(MANAGED_DIR, "compiler/contract-info.json"), "utf8"),
  );

  console.log(`   ✓ Compiler version: ${contractInfo["compiler-version"]}`);
  console.log(`   ✓ Language version: ${contractInfo["language-version"]}`);
  console.log(
    `   ✓ Circuits: ${contractInfo.circuits.map((c) => c.name).join(", ")}`,
  );
  console.log(
    `   ✓ Witnesses: ${contractInfo.witnesses.map((w) => w.name).join(", ")}`,
  );

  // Step 4: Import and deploy using Midnight SDK
  console.log("\n⛓️  Preparing deployment...");

  try {
    const { deployContract } =
      await import("@midnight-ntwrk/midnight-js-contracts");
    console.log("   ✓ midnight-js-contracts SDK loaded");

    // The actual deployment requires browser-based Lace wallet signing.
    // This section demonstrates the deployment pattern:
    //
    // const providers = {
    //   walletProvider: laceWalletProvider,    // From Lace DApp connector
    //   proofProvider: httpProofProvider,       // From proof server
    //   publicDataProvider: indexerProvider,    // From Midnight indexer
    // };
    //
    // const deployed = await deployContract(providers, {
    //   contract: new Contract(witnesses),
    //   initialState: {},
    // });
    //
    // console.log("Contract address:", deployed.deployedContractAddress);

    console.log(
      "\n⚠️  Full deployment requires Lace wallet browser extension.",
    );
    console.log(
      "   The contract is compiled and ready to deploy via the frontend.",
    );
    console.log(
      "   Connect Lace wallet at http://localhost:3000 to complete deployment.",
    );
  } catch (err) {
    console.error("❌ SDK import failed:", err.message);
    process.exit(1);
  }

  // Step 5: Summary
  console.log("\n📋 Deployment Status:");
  console.log(
    "   ✅ Contract source: pkgs/contract/src/patient_registry.compact",
  );
  console.log("   ✅ Compiled artifacts: managed/");
  console.log("   ✅ Proof server: running at localhost:6300");
  console.log("   ⏳ On-chain deployment: requires Lace wallet connection");
  console.log("");
  console.log("📋 Next steps:");
  console.log("   1. Install Lace wallet browser extension");
  console.log("   2. Connect to Midnight Preprod network in Lace");
  console.log("   3. Fund wallet with tNight tokens");
  console.log("   4. Run: npm run dev");
  console.log("   5. Navigate to the app and connect wallet");
  console.log("   6. Deploy contract through the frontend interface");
}

deploy().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
