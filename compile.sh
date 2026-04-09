#!/bin/bash
# Compile the Compact contract and emit managed artifacts.

set -e

CONTRACT_SRC="pkgs/contract/src/patient_registry.compact"
OUT_DIR="managed"

echo "Compiling Compact contract from $CONTRACT_SRC..."

# Check if compact compiler is available
if ! command -v compactc &> /dev/null; then
  echo "Error: compactc not found in PATH."
  echo "Please install Midnight toolchain from docs.midnight.network/getting-started/installation"
  exit 1
fi


mkdir -p "$OUT_DIR"

# compactc emits the proving/verification key material and generated artifacts into OUT_DIR.
compactc "$CONTRACT_SRC" "$OUT_DIR"

echo "Artifacts generated in $OUT_DIR"
echo ""
echo "Ready for Midnight Devnet deployment."
