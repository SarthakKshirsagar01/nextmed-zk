# Docker Setup (Midnight Proof Server)

This project uses the official Midnight Proof Server image.

## Prerequisites

- Docker Desktop installed and running
- Contract artifacts and keys generated in managed/

## Start Service

docker-compose up

Service exposed on:

- http://localhost:6300

Health check:

curl http://localhost:6300/health

Expected response:

{"status":"ok"}

## Notes

- docker-compose mounts managed/ into container path /keys as read-only.
- Compile contract artifacts before starting Docker so key files are present.
- If health check fails, confirm managed/ contains generated key artifacts from compactc.
