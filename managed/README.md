# Midnight Managed Artifacts

This folder contains compiled contract artifacts for the NextMed proof system.

## Files

- **contracts/patient_registry.managed.json** – Compiled contract state machine (managed code)
- **contracts/patient_registry.abi.json** – Application Binary Interface / circuit ABI
- **contracts/patient_registry.bytecode** – Compiled bytecode for Midnight VM execution

## Generation

Run the compile script from the workspace root to generate/update artifacts:

```bash
# Option 1: Using npm script
npm run compile:contract

# Option 2: Direct bash
bash compile.sh
```

**Requirements:**

- Midnight toolchain installed ([docs.midnight.network/getting-started/installation](https://docs.midnight.network/getting-started/installation))
- `midnight-compile` command in PATH

## Usage

Import the `.managed.json` into the Midnight SDK for proof generation and verification:

```typescript
import managedContract from './contracts/patient_registry.managed.json';

const contract = new MidnightContract(managedContract);
await contract.prove({...});
```

## Submission Checklist

- [ ] Artifacts generated with `npm run compile:contract`
- [ ] All three files present in `managed/contracts/`
- [ ] Contract logic matches `pkgs/contract/src/patient_registry.compact`
- [ ] Ready for Midnight Devnet deployment
