#!/bin/bash
# Compile the Midnight Compact contract and generate managed artifacts

set -e

CONTRACT_SRC="pkgs/contract/src/patient_registry.compact"
MANAGED_DIR="managed/contracts"

echo "Compiling Compact contract from $CONTRACT_SRC..."

# Check if compact compiler is available
if ! command -v midnight-compile &> /dev/null; then
  echo "Error: midnight-compile not found in PATH."
  echo "Please install Midnight toolchain from docs.midnight.network/getting-started/installation"
  exit 1
fi

# Compile and emit managed artifacts
midnight-compile "$CONTRACT_SRC" \
  --output-managed "$MANAGED_DIR/patient_registry.managed.json" \
  --output-abi "$MANAGED_DIR/patient_registry.abi.json" \
  --output-bytecode "$MANAGED_DIR/patient_registry.bytecode"

echo "✓ Managed artifacts generated:"
echo "  - $MANAGED_DIR/patient_registry.managed.json"
echo "  - $MANAGED_DIR/patient_registry.abi.json"
echo "  - $MANAGED_DIR/patient_registry.bytecode"
echo ""
echo "Ready for Midnight Devnet deployment."
