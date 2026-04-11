// deploy-contract.mjs
// Deploy patient_registry contract to Midnight Preprod from CLI.
//
// Usage:
//   $env:MIDNIGHT_SEED="ecabd1a..."; node deploy-contract.mjs
//
// Prerequisites:
//   1. Contract compiled: managed/ contains keys, zkir, contract
//   2. Proof server running: docker-compose up midnight-proof-server
//   3. Wallet funded with tNight/DUST on preprod

import { readFileSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Network Config ────────────────────────────────────────────
const INDEXER_URL = "https://indexer.preprod.midnight.network/api/v4/graphql";
const INDEXER_WS_URL =
  "wss://indexer.preprod.midnight.network/api/v4/graphql";
const NODE_URL = "https://rpc.preprod.midnight.network";
const PROOF_SERVER = "http://localhost:6300";
const MANAGED_DIR = resolve(__dirname, "managed");
const CONTRACT_NAME = "patient_registry";
const NETWORK_ID = "preprod";

// ── Load seed ─────────────────────────────────────────────────
const seed = process.env.MIDNIGHT_SEED;
if (!seed) {
  console.error("❌ Set MIDNIGHT_SEED env variable:");
  console.error(
    '   $env:MIDNIGHT_SEED="your_hex_seed"; node deploy-contract.mjs',
  );
  process.exit(1);
}

async function main() {
  console.log("🚀 NextMed ZK — Contract Deployment");
  console.log("   Network:       Midnight Preprod");
  console.log("   Node:         ", NODE_URL);
  console.log("   Indexer:      ", INDEXER_URL);
  console.log("   Proof Server: ", PROOF_SERVER);
  console.log("   Managed Dir:  ", MANAGED_DIR);
  console.log("");

  // Step 1: Verify proof server
  console.log("🔍 Step 1: Checking proof server...");
  try {
    const res = await fetch(`${PROOF_SERVER}/health`);
    const data = await res.json();
    console.log("   ✅ Proof server healthy:", data.status);
  } catch (e) {
    console.error(
      "   ❌ Proof server not running. Start with: docker-compose up midnight-proof-server",
    );
    process.exit(1);
  }

  // Step 2: Load providers
  console.log("\n📦 Step 2: Loading SDK providers...");

  const { NodeZkConfigProvider } =
    await import("@midnight-ntwrk/midnight-js-node-zk-config-provider");
  const { httpClientProofProvider } =
    await import("@midnight-ntwrk/midnight-js-http-client-proof-provider");
  const { indexerPublicDataProvider } =
    await import("@midnight-ntwrk/midnight-js-indexer-public-data-provider");
  const { levelPrivateStateProvider } =
    await import("@midnight-ntwrk/midnight-js-level-private-state-provider");
  const { deployContract } =
    await import("@midnight-ntwrk/midnight-js-contracts");
  const { WalletBuilder } = await import("@midnight-ntwrk/wallet");
  const { setNetworkId } =
    await import("@midnight-ntwrk/midnight-js-network-id");
  const {
    make: makeCompiledContract,
    withWitnesses,
    withCompiledFileAssets,
  } = await import("@midnight-ntwrk/compact-js/effect/CompiledContract");
  // WalletBuilder.build expects raw numeric NetworkId from @midnight-ntwrk/zswap
  // 0=Undeployed, 1=DevNet, 2=TestNet(=Preprod), 3=MainNet
  const networkId = 2;
  setNetworkId("test");

  console.log("   ✅ All SDK modules loaded");

  // Step 3: Build ZK config provider
  console.log("\n🔑 Step 3: Loading ZK config (keys + ZKIR)...");
  const zkConfigProvider = new NodeZkConfigProvider(MANAGED_DIR);
  console.log("   ✅ ZK config provider ready from:", MANAGED_DIR);

  // Step 4: Build proof provider
  console.log("\n🛡️  Step 4: Connecting to proof server...");
  const proofProvider = httpClientProofProvider(PROOF_SERVER, zkConfigProvider);
  console.log("   ✅ Proof provider connected");

  // Step 5: Build public data provider (indexer)
  console.log("\n📡 Step 5: Connecting to indexer...");
  const publicDataProvider = indexerPublicDataProvider(
    INDEXER_URL,
    INDEXER_WS_URL,
  );
  console.log("   ✅ Public data provider connected");

  // Step 6: Build wallet from seed
  console.log("\n💳 Step 6: Building wallet from seed...");
  console.log("   (This may take 30-60 seconds while syncing...)");

  // networkId = 2 (TestNet/Preprod) set above

  let wallet;
  try {
    wallet = await WalletBuilder.build(
      INDEXER_URL,
      INDEXER_WS_URL,
      PROOF_SERVER,
      NODE_URL,
      seed,
      networkId,
      "info",
    );
    console.log("   ✅ Wallet built and synced");
  } catch (e) {
    console.error("   ❌ Wallet build failed:", e.message);
    console.error("   Make sure your seed is correct and wallet is funded.");
    process.exit(1);
  }

  // Step 7: Build private state provider
  console.log("\n🗄️  Step 7: Initializing private state storage...");
  const privateStateProvider = levelPrivateStateProvider({
    privateStoragePasswordProvider: () => "nextmed-deploy-temp-password-1234",
    accountId: seed.substring(0, 16),
  });
  console.log("   ✅ Private state provider ready");

  // Step 8: Load contract
  console.log("\n📄 Step 8: Loading compiled contract...");

  // Import the compiled contract
  const contractPath = pathToFileURL(
    join(MANAGED_DIR, "contract", "index.js"),
  ).href;
  const contractModule = await import(contractPath);
  const Contract = contractModule.Contract;

  // Create witness stubs (needed for deployment, not actual execution)
  const witnesses = {
    local_health_record: (ctx) => [ctx.privateState, ""],
    clinic_signature: (ctx) => [ctx.privateState, ""],
    claimed_vaccine_id: (ctx) => [ctx.privateState, ""],
    expected_issuer_hash: (ctx) => [ctx.privateState, ""],
    current_timestamp: (ctx) => [ctx.privateState, 0n],
    proof_nonce: (ctx) => [ctx.privateState, ""],
  };

  const contract = new Contract(witnesses);
  const compiledContract = withCompiledFileAssets(
    withWitnesses(makeCompiledContract(CONTRACT_NAME, Contract), witnesses),
    MANAGED_DIR,
  );
  console.log("   ✅ Contract loaded with 3 circuits");

  // Step 9: Start wallet and get state
  console.log("\n🔄 Step 9: Starting wallet and syncing...");
  await wallet.start();

  // Wait for wallet state to be fully synced so ledger params are available.
  const walletState = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Wallet sync timeout")), 180000);
    const sub = wallet.state().subscribe({
      next: (s) => {
        if (s?.syncProgress?.synced === true) {
          clearTimeout(timeout);
          sub.unsubscribe();
          resolve(s);
        }
      },
      error: (e) => {
        clearTimeout(timeout);
        reject(e);
      },
    });
  });

  console.log("   ✅ Wallet state ready");
  console.log("   Coin Public Key:", walletState.coinPublicKey);
  console.log("   Encryption Public Key:", walletState.encryptionPublicKey);
  console.log("   Balances:", JSON.stringify(walletState.balances));

  // Build wallet provider adapter (v5 wallet → v4 contracts SDK interface)
  const walletProvider = {
    // Required for deploy: coin public key & encryption public key
    getCoinPublicKey: () => walletState.coinPublicKey,
    getEncryptionPublicKey: () => walletState.encryptionPublicKey,
    // Required for signing: return a finalized balanced tx (not a proving recipe)
    balanceTx: async (tx) => {
      const balanced = await wallet.balanceTransaction(tx, []);
      if (balanced.type === "NothingToProve") {
        return balanced.transaction;
      }
      return wallet.proveTransaction(balanced);
    },
  };

  // Build midnight provider adapter (handles submission)
  const midnightProvider = {
    submitTx: async (tx) => wallet.submitTransaction(tx),
  };

  // Assemble providers and deploy
  console.log("\n⛓️  Step 10: Deploying contract to Midnight Preprod...");
  console.log("   (This submits a transaction — may take 1-3 minutes)");

  const providers = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };

  try {
    const deployed = await deployContract(providers, {
      compiledContract,
    });

    const contractAddress = deployed.deployedContractAddress;

    console.log("\n✅ ======================================");
    console.log("   CONTRACT DEPLOYED SUCCESSFULLY!");
    console.log("   ======================================");
    console.log("   Address:", contractAddress);
    console.log("   Network: Midnight Preprod");
    console.log("");

    // Save contract address to .env.local
    const envPath = join(__dirname, ".env.local");
    let envContent = "";
    try {
      envContent = readFileSync(envPath, "utf8");
    } catch {
      envContent = [
        "NEXT_PUBLIC_MIDNIGHT_NETWORK=preprod",
        `NEXT_PUBLIC_MIDNIGHT_NODE_URL=${NODE_URL}`,
        `NEXT_PUBLIC_PROOF_SERVER_URL=${PROOF_SERVER}`,
        "",
      ].join("\n");
    }

    if (envContent.includes("NEXT_PUBLIC_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`,
      );
    } else {
      envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}\n`;
    }

    writeFileSync(envPath, envContent);
    console.log("   ✅ Saved to .env.local");

    // Also save to a deploy output file
    const output = [
      `Contract: patient_registry`,
      `Network: Midnight Preprod`,
      `Address: ${contractAddress}`,
      `Deployed: ${new Date().toISOString()}`,
      `Node: ${NODE_URL}`,
      `Seed prefix: ${seed.substring(0, 8)}...`,
    ].join("\n");

    writeFileSync(join(__dirname, "deploy-output.txt"), output);
    console.log("   ✅ Saved to deploy-output.txt");

    console.log("\n📋 Next Steps:");
    console.log("   1. Copy address to README.md");
    console.log("   2. Restart frontend: npm run dev");
    console.log("   3. Commit & push: git add -A && git commit && git push");
  } catch (e) {
    console.error("\n❌ Deployment failed:", e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }

  // Cleanup
  if (wallet && typeof wallet.close === "function") {
    await wallet.close();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
