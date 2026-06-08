# Memories of Leslie

A living memory book where people who knew Leslie can share memories of her.


Note: Portions of this project have been designed with the use of Claude

---

## Project Overview

- **Dev URL**: https://memories.anthony.com
- **Prod URL**: https://memoriesofleslie.com
- **Stack**: Next.js (App Router) + PostgreSQL + Kubernetes (Helm)
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
│   │   ├── page.tsx                          # Memory wall (home) — reads ?sort= and ?filter= params
│   │   ├── submit/page.tsx                   # Submit a Memory
│   │   ├── other/page.tsx                    # Other page — Spotify embed card + Program card with modal
│   │   ├── admin/page.tsx                    # Admin table (server component, force-dynamic)
│   │   ├── admin/AdminTable.tsx              # 'use client' — table with delete buttons
│   │   ├── admin/login/page.tsx              # Login page (server component, redirects if authed)
│   │   ├── admin/login/AdminLoginForm.tsx    # 'use client' — login form
│   │   ├── api/memories/route.ts             # GET + POST API handlers
│   │   ├── api/admin/login/route.ts          # POST — validates ADMIN_PASSWORD, sets cookie
│   │   ├── api/admin/memories/[id]/route.ts  # DELETE — removes a memory by ID
│   │   └── layout.tsx                        # Root layout — async, fetches distinct names, passes to NavBar
│   ├── components/
│   │   ├── NavBar.tsx            # 'use client' — mobile: 3 rows; desktop: 1 row (2 rows on home w/ sort controls); hidden on /admin
│   │   ├── MemoryCard.tsx        # 'use client' — line-clamp-10, detects clamping via DOM ref
│   │   ├── MemoryGrid.tsx        # 'use client' — owns modal state, renders modal as sibling
│   │   └── MemoryModal.tsx       # expand overlay — close via X, backdrop click, or Escape
│   └── middleware.ts             # Edge middleware — protects /admin and /api/admin/* routes
├── db/
│   └── init.sql                  # Database schema
├── public/
│   ├── rose.png                              # Yellow rose icon used in nav + hero
│   ├── program_preview.png                   # Preview thumbnail shown on /other Program card
│   ├── program_1.jpeg                        # Program page 1 (shown in modal)
│   └── program_2.jpeg                        # Program page 2 (shown in modal)
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
        ├── backup-cronjob.yaml
        └── storageclass.yaml
├── scripts/                                  # All scripts self-cd to dev/ — safe to call from any directory
│   ├── deploy.sh                             # Build, push, and deploy to active cluster
│   ├── restore.sh                            # Interactive full-cluster recovery runbook
│   ├── restore-db.sh <file.sql.gz>           # Restore memories table from a backup file
│   └── list-backups.sh                       # List backup files on the backup PVC
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
| `ADMIN_PASSWORD` | Protects the `/admin` page | any strong password |

---

## Database

### Schema

```sql
CREATE TABLE memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  memory_text   TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  approved      BOOLEAN DEFAULT TRUE,
  submitter_ip  TEXT
);
```

- `name` is nullable — blank submissions are stored as NULL and displayed as "Anonymous"
- `approved` defaults to TRUE (no moderation queue currently)
- `submitter_ip` is captured from `x-forwarded-for` → `x-real-ip` → `'unknown'` on POST
- Schema is applied via `db/init.sql` at container startup

---

## ⚠️ PVC / Data Persistence — Critical

**The PostgreSQL data and backup volumes are the most important assets in this cluster. Loss of these PVCs means loss of all submitted memories.**

### PVC Configuration

A custom `longhorn-retain` StorageClass (`k8s/templates/storageclass.yaml`) sets `reclaimPolicy: Retain` automatically. New deploys use it everywhere. The two existing live PVCs are a special case:

| PVC | StorageClass | Retain how |
|---|---|---|
| `postgres-data-...-postgres-0` | `longhorn` (existing, immutable) | PV manually patched to Retain |
| `memories-of-leslie-backup` | `longhorn` (existing, immutable) | PV manually patched to Retain |

Future fresh deploys will provision both PVCs with `longhorn-retain` automatically.

The `Retain` reclaim policy means if the StatefulSet or Helm release is deleted, the PVs will **not** be garbage collected — they remain in `Released` state and can be re-bound manually.

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
| Current image tag | `a27a7b5` |

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

The registry is **private** — every cluster needs an image pull secret before pods can pull images.

`values.yaml` uses `IMAGE_TAG` as a placeholder. Never use `latest` — always tag with the git commit SHA.

### Image Pull Secret

Required once per cluster. Uses a GitHub Personal Access Token (PAT) — not your GitHub password. PAT scope needed: `read:packages`.

Create at: GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --docker-server=ghcr.io \
  --docker-username=anthonyi7 \
  --docker-password=<YOUR_PAT> \
  --namespace mol
```

The secret is referenced in `deployment.yaml` via `imagePullSecrets`. It survives Helm upgrades — create once per cluster, never recreate unless the PAT is rotated.

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
     --from-literal=ADMIN_PASSWORD=<strong-admin-password> \
     --namespace mol
   ```

3. **Create the GHCR image pull secret** (registry is private — required before pods can start):
   ```bash
   kubectl create secret docker-registry ghcr-pull-secret \
     --docker-server=ghcr.io \
     --docker-username=anthonyi7 \
     --docker-password=<YOUR_PAT> \
     --namespace mol
   ```
   PAT scope needed: `read:packages`. Create at GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic).

4. **Build and push the image** (see Build and Push section above).

5. **Deploy:**
   ```bash
   helm upgrade --install memories-of-leslie ./k8s \
     --namespace mol \
     --set image.tag=<IMAGE_TAG>
   ```

6. PVs are automatically set to Retain via the `longhorn-retain` StorageClass. No manual patching required.

7. **Verify pods are running:**
   ```bash
   kubectl get pods -n mol
   ```

8. **Verify ingress:**
   ```bash
   kubectl get ingress -n mol
   ```

9. **Add DNS entry:** `memories.anthony.com` → `192.168.4.50` in Windows DNS

---

### Adding ADMIN_PASSWORD to an Existing Secret

If the cluster is already running (secret was created without `ADMIN_PASSWORD`), patch the existing secret rather than recreating it:

```bash
kubectl patch secret memories-postgres-secret -n mol \
  --type='json' \
  -p='[{"op":"add","path":"/data/ADMIN_PASSWORD","value":"'$(echo -n "<your-admin-password>" | base64)'"}]'
```

Then restart the pods to pick up the new env var:

```bash
kubectl rollout restart deployment/memories-of-leslie-app -n mol
```

### Database Migration (submitter_ip column)

The `submitter_ip` column was added in v0.1.3. Run this once on any existing database:

```bash
kubectl exec -it -n mol <postgres-pod-name> -- psql -U leslie -d leslie -c \
  "ALTER TABLE memories ADD COLUMN IF NOT EXISTS submitter_ip TEXT;"
```

---

### Backup and Restore Scripts

Run from `dev/`:

```bash
# List backup files on the backup PVC
./scripts/list-backups.sh

# Restore the memories table from a specific backup file
./scripts/restore-db.sh leslie_YYYYMMDD_HHMMSS.sql.gz
```

`restore-db.sh` drops the existing table (with `IF EXISTS`), runs the restore pod, waits for completion, prints logs, and cleans up. Safe to run against a live cluster.

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

## ⚠️ Off-Cluster Backups — Not Yet Configured

**Current gap:** all backup data lives inside the cluster on the backup PVC. If the physical nodes die, both the data volume and the backup PVC are lost. The in-cluster backup/restore workflow (`restore-db.sh`) only protects against logical data loss (accidental deletes, table drops) while the cluster is healthy.

**Planned fix:** configure Longhorn backup target → Backblaze B2. Longhorn can push volume snapshots to any S3-compatible bucket on a schedule. This is the next infrastructure task before going to prod.

Until this is set up, the site should not be considered production-safe from a data durability standpoint.

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

## Admin Page

### Access

Navigate to `/admin`. You will be redirected to `/admin/login` if not authenticated.

Enter the `ADMIN_PASSWORD` value from the Kubernetes secret. On success a `admin_session` cookie is set (httpOnly, secure in production, sameSite=strict, 24h TTL) and you are redirected to `/admin`.

### Admin Table

Displays all memories (approved and unapproved) with:
- Submitted date
- Submitter name (or Anonymous)
- Memory text truncated to 100 chars (full text on hover)
- Submitter IP address
- Delete button — permanent, no confirmation, row removed immediately without page reload

### Middleware

`src/middleware.ts` runs on the Edge Runtime and protects all `/admin` and `/api/admin/*` routes. `/admin/login` and `/api/admin/login` are explicitly excluded from protection.

- Unauthenticated browser requests → redirect to `/admin/login`
- Unauthenticated API requests → `401 Unauthorized` JSON response

### Admin API

`DELETE /api/admin/memories/:id` — permanently deletes the memory with the given UUID. Returns `{ ok: true }` or `404` if not found. Requires the `admin_session` cookie.

---

## API Reference

### `GET /api/memories?sort=date|alpha&filter=<value>`

Returns approved memories. Anonymous entries always sort first regardless of `sort` param.

| Parameter | Values | Behavior |
|---|---|---|
| `sort` | `date` (default) | Newest first |
| `sort` | `alpha` | A–Z by name; anonymous first |
| `filter` | _(omitted)_ | All memories |
| `filter` | `anonymous` | Anonymous entries only (`WHERE name IS NULL`) |
| `filter` | `<name>` | Entries matching that name exactly (parameterized query) |

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

## Longhorn Backup Target — Backblaze B2

### Prerequisites
- Backblaze B2 account with a private bucket named `mol-longhorn-backups`
- Application Key scoped to that bucket (keyID + applicationKey)
- Bucket endpoint URL (found in B2 console under bucket details, looks like
  `https://s3.us-west-004.backblazeb2.com`)

### Step 1 — Create the Kubernetes secret
```bash
kubectl create secret generic longhorn-b2-secret \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID=<your-b2-keyID> \
  --from-literal=AWS_SECRET_ACCESS_KEY=<your-b2-applicationKey> \
  --from-literal=AWS_ENDPOINTS=https://s3.us-west-004.backblazeb2.com
```
Replace the endpoint with your actual bucket endpoint.

### Step 2 — Create the backup target in Longhorn UI
Longhorn UI (via Rancher) → Backup and Restore → Backup Targets →
Create Backup Target:
- Name: `memories-b2`
- URL: `s3://mol-longhorn-backups@us-west-004/`
  (region must match your endpoint — e.g. us-west-004)
- Credential Secret: `longhorn-b2-secret`
- Save and confirm status shows Available

Note: The URL field takes only the s3:// format. The https:// endpoint
goes in the secret only — do not put it in the URL field or it will fail.

### Step 3 — Create the recurring backup job
Longhorn UI → Recurring Jobs → Create Recurring Job:
- Name: `postgres-memories`
- Task: Backup
- Retain: 14
- Concurrency: 1
- Cron: `0 2 * * *` (2:00 AM UTC = 8:00 PM MDT / 7:00 PM MST)
- Click OK

### Step 4 — Assign the job to the postgres-data volume
Longhorn UI → Volumes → click the postgres-data volume →
scroll to Recurring Jobs → add `postgres-memories` and select
backup target `memories-b2`

### Step 5 — Verify
Trigger a manual backup from the volume page (Create Backup button)
and confirm it appears in:
- Longhorn UI → Backup and Restore → Backups
- Backblaze B2 console → your bucket (files should appear within a minute)

---

## Architecture Notes

- No authentication required for submissions
- No hardcoded credentials anywhere — all secrets via Kubernetes Secret or env vars
- `docker-compose.yml` is for local development only; never used in cluster
- Claude chat (claude.ai) is used in tandem for high-level and architectural decisions — document significant decisions here or in commit messages

---

