# Memories of Leslie

A living memory book where people who knew Leslie can share memories of her.

---

## Project Overview

- **Dev URL**: https://memories.anthony.com
- **Prod URL**: https://memoriesofleslie.com
- **Stack**: Next.js (App Router) + PostgreSQL + Kubernetes (Helm)
- **Service is in June 2025** — this is the highest priority project

---

## Directory Layout

```
~/projects/memories_of_leslie/
├── dev/          ← All development happens here
└── prod/         ← Do not develop directly; populated via git pull from dev when stable
```

All application code, Dockerfiles, and Kubernetes manifests live inside `dev/`.

---

## Application Structure

```
dev/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Memory wall (home)
│   │   ├── submit/page.tsx       # Submit a Memory
│   │   ├── api/memories/route.ts # GET + POST API handlers
│   │   └── layout.tsx            # Root layout with nav bar
│   └── components/
│       ├── NavBar.tsx
│       ├── MemoryCard.tsx      # 'use client' — line-clamp-10, detects clamping via DOM ref
│       ├── MemoryGrid.tsx      # 'use client' — owns modal state, renders modal as sibling
│       └── MemoryModal.tsx     # expand overlay — close via X, backdrop click, or Escape
├── db/
│   └── init.sql                  # Database schema
├── public/
├── Dockerfile
├── docker-compose.yml            # Local dev only
├── .env.example
├── next.config.js
├── package.json
├── tsconfig.json
└── k8s/
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── deployment.yaml
        ├── service.yaml
        ├── ingress.yaml
        ├── postgres-statefulset.yaml
        ├── postgres-service.yaml
        ├── pvc.yaml
        ├── configmap.yaml
        ├── secret.yaml
        ├── pdb.yaml
        └── backup-cronjob.yaml
```

---

## Local Development

### Prerequisites

- Docker + Docker Compose
- Node.js 20+

### Setup

```bash
cd dev
cp .env.example .env
# Edit .env with local values

docker compose up -d        # Start Postgres
npm install
npm run dev                 # Start Next.js at http://localhost:3000
```

### Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/leslie` |

---

## Database

### Schema

```sql
CREATE TABLE memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  memory_text   TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  approved      BOOLEAN DEFAULT TRUE
);
```

- `name` is nullable — blank submissions are stored as NULL and displayed as "Anonymous"
- `approved` defaults to TRUE (no moderation queue currently)
- Schema is applied via `db/init.sql` at container startup

---

## ⚠️ PVC / Data Persistence — Critical

**The PostgreSQL data and backup volumes are the most important assets in this cluster. Loss of these PVCs means loss of all submitted memories.**

### PVC Configuration

All PVCs use:
- `storageClassName: longhorn`
- `persistentVolumeReclaimPolicy: Retain`

The `Retain` reclaim policy is deliberate and must never be changed. If the StatefulSet or Helm release is deleted, the PVs will **not** be garbage collected — they remain in `Released` state and can be re-bound manually.

### Volumes in Use

| PVC | Purpose | Mount Path |
|---|---|---|
| `postgres-data` | Live PostgreSQL data directory | `/var/lib/postgresql/data` |
| `postgres-backup` | Nightly pg_dump archives | `/backups` |

### Backup Strategy

A `CronJob` (`backup-cronjob.yaml`) runs nightly and:
1. Runs `pg_dump` against the PostgreSQL service
2. Gzip-compresses the output
3. Writes the archive to the `postgres-backup` PVC

**Backup naming convention**: `leslie_YYYYMMDD_HHMMSS.sql.gz`

Old backups should be pruned manually or via a retention script to avoid filling the volume. Monitor Longhorn dashboard for volume capacity.

### Recovery Procedure (data loss scenario)

1. Identify the surviving PV in Longhorn or via `kubectl get pv`
2. Re-create a PVC with the same name and `volumeName` pointing to the existing PV
3. Re-deploy the StatefulSet — it will bind to the retained volume
4. If restoring from backup: copy the latest `.sql.gz` from the backup PVC, decompress, and run `psql < dump.sql`

### Longhorn Snapshots

In addition to the CronJob backups, configure Longhorn recurring snapshots on both volumes via the Longhorn UI:
- `postgres-data`: daily snapshot, retain 7
- `postgres-backup`: weekly snapshot, retain 4

This provides a secondary recovery path independent of the application-level backup job.

---

## Kubernetes / Helm

### Cluster Infrastructure (already running — do not reinstall)

| Component | Notes |
|---|---|
| MetalLB | External IP `192.168.4.50` (dev), `192.168.1.50` (prod) |
| ingress-nginx | Community edition — use `nginx` ingressClassName |
| cert-manager | ClusterIssuer: `dev-ca-issuer` |
| Longhorn | Storage provider for all PVCs |
| Rancher | Cluster management |

### Dev Cluster Active Configuration

| Setting | Value |
|---|---|
| Namespace | `mol` |
| cert-manager ClusterIssuer | `dev-ca-issuer` |
| Ingress hostname | `memories.anthony.com` |
| MetalLB IP | `192.168.4.50` |
| Current image tag | `v0.1.1` |

### Deploying to Dev

```bash
cd dev

# Create the database secret (never committed to git — see Runbook for full details)
kubectl create secret generic memories-postgres-secret \
  --from-literal=POSTGRES_USER=leslie \
  --from-literal=POSTGRES_PASSWORD=<your-password> \
  --from-literal=DATABASE_URL='postgresql://leslie:<your-password>@postgres-service:5432/leslie' \
  --namespace mol

# Deploy
helm upgrade --install memories-of-leslie ./k8s \
  --namespace mol \
  --set image.tag=<IMAGE_TAG>
```

### Container Registry

All images are published to GitHub Container Registry (GHCR):

```
ghcr.io/anthonyi7/memories-of-leslie:<tag>
```

`values.yaml` uses `IMAGE_TAG` as a placeholder. Never use `latest` — always tag with the git commit SHA.

### Build and Push

Run from the `dev/` directory:

```bash
# Authenticate to GHCR (one time per machine)
# PAT scopes required: write:packages, read:packages, delete:packages
# Create at: GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
echo $CR_PAT | docker login ghcr.io -u anthonyi7 --password-stdin

# Build
docker build -t ghcr.io/anthonyi7/memories-of-leslie:$(git rev-parse --short HEAD) .

# Push
docker push ghcr.io/anthonyi7/memories-of-leslie:$(git rev-parse --short HEAD)

# Deploy with the new tag
helm upgrade --install memories-of-leslie ./k8s \
  --namespace mol \
  --set image.tag=$(git rev-parse --short HEAD)
```

### Key Manifest Notes

- `replicas: 3` with `topologySpreadConstraints` — one pod per worker node
- `PodDisruptionBudget` — `minAvailable: 2`
- Resource requests and limits on all containers
- Readiness and liveness probes on the Next.js deployment
- Ingress annotations use community ingress-nginx style (`nginx.ingress.kubernetes.io/`)
- TLS via cert-manager — certificate issued automatically from the configured ClusterIssuer

---

## Runbook

### First Deploy Checklist

1. **Fill in `certManager.clusterIssuer`** in `k8s/values.yaml`.  
   Dev cluster issuer is `dev-ca-issuer` — already set. Check available issuers: `kubectl get clusterissuer`

2. **Create the database secret** (never committed to git):
   ```bash
   kubectl create secret generic memories-postgres-secret \
     --from-literal=POSTGRES_USER=leslie \
     --from-literal=POSTGRES_PASSWORD=<your-password> \
     --from-literal=DATABASE_URL='postgresql://leslie:<your-password>@postgres-service:5432/leslie' \
     --namespace mol
   ```

3. **Build and push the image** (see Build and Push section above).

4. **Deploy:**
   ```bash
   helm upgrade --install memories-of-leslie ./k8s \
     --namespace mol \
     --set image.tag=<IMAGE_TAG>
   ```

5. **Patch PVs to Retain immediately after deploy** — do this before anything else:
   ```bash
   kubectl get pvc -n mol
   kubectl patch pv <pv-name> -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
   # Run for each PV — there will be at least two: postgres-data and backup
   ```

6. **Verify pods are running:**
   ```bash
   kubectl get pods -n mol
   ```

7. **Verify ingress:**
   ```bash
   kubectl get ingress -n mol
   ```

8. **Add DNS entry:** `memories.anthony.com` → `192.168.4.50` in Windows DNS

---

### Verify Backup CronJob

```bash
# Manually trigger a test run
kubectl create job --from=cronjob/memories-of-leslie-backup manual-backup-test -n mol

# Check logs
kubectl logs -l job-name=manual-backup-test -n mol
```

---

### Confirm Longhorn RWX Is Enabled

Before first deploy, check Longhorn UI (via Rancher) → **Settings → Allow RWX volumes**.

The backup PVC uses `ReadWriteMany` — this requires Longhorn NFS mode to be active. If RWX is not enabled, the backup CronJob pod will fail to schedule.

---

## Dev → Prod Promotion

When a dev branch is stable and merged to `main`:

1. On the prod host: `git pull` inside `prod/`
2. Change ingress hostname from `memories.anthony.com` → `memoriesofleslie.com`
3. Update MetalLB context to prod cluster IP `192.168.1.50`
4. Point external DNS for `memoriesofleslie.com` to the prod public IP via UDM
5. Run `helm upgrade` on the prod cluster

Everything else in the manifests is identical between dev and prod.

---

## API Reference

### `GET /api/memories?sort=date|alpha`

Returns all approved memories. Anonymous entries always sort first regardless of `sort` param.

| Sort | Behavior |
|---|---|
| `date` | Newest first (default) |
| `alpha` | A–Z by name; anonymous first |

### `POST /api/memories`

Creates a new memory submission.

**Body** (JSON):
```json
{
  "name": "Jane Smith",       // optional — omit or null for anonymous
  "memory_text": "She always..."
}
```

**Rate limiting**: max 5 submissions per IP per hour (server-side).

**Limits**: `memory_text` max 10,000 characters.

---

## Architecture Notes

- This site is designed for long-term durability — it should outlast any single cluster
- No authentication required for submissions
- No hardcoded credentials anywhere — all secrets via Kubernetes Secret or env vars
- `docker-compose.yml` is for local development only; never used in cluster
- Claude chat (claude.ai) is used in tandem for high-level and architectural decisions — document significant decisions here or in commit messages

---

## Contacts / Context

- Memorial service: June 2025
- Developer: Anthony (anthonyirwin95@gmail.com)
