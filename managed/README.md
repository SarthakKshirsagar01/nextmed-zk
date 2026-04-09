# Midnight Compile Output

This folder stores generated contract artifacts and key material emitted by compactc.

## Generation

From workspace root:

- npm run compile:contract

Or directly:

- bash compile.sh

## Requirements

- Midnight toolchain installed
- compactc available in PATH

## Notes

- docker-compose mounts this folder into the proof-server container at /keys (read-only)
- proving and verification key files are ignored by git via .gitignore
