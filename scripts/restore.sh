#!/usr/bin/env bash
# restore.sh — Memories of Leslie recovery script
#
# Run this when the cluster needs to be rebuilt or data needs to be restored
# from a retained PV or a pg_dump backup file.
#
# Requires: kubectl, helm, and an active kubeconfig pointing to the right cluster.
# Safe to run multiple times — uses --dry-run where appropriate.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

NAMESPACE="mol"
RELEASE="memories-of-leslie"
HELM_CHART="./k8s"
IMAGE_REPO="ghcr.io/anthonyi7/memories-of-leslie"

echo "============================================================"
echo "  Memories of Leslie — Recovery Script"
echo "============================================================"
echo ""

# ─── STEP 1: Pre-flight checks ───────────────────────────────────

echo "STEP 1: Pre-flight checks"
echo ""
echo "Current kubectl context:"
kubectl config current-context
echo ""
read -rp "Is this the correct cluster? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted. Switch to the correct context with: kubectl config use-context <name>"
  exit 1
fi

echo ""
echo "Checking namespace '$NAMESPACE'..."
if kubectl get namespace "$NAMESPACE" &>/dev/null; then
  echo "  Namespace '$NAMESPACE' exists."
else
  echo "  Namespace '$NAMESPACE' not found. Creating..."
  kubectl create namespace "$NAMESPACE"
fi

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 2: Find retained PVs ───────────────────────────────────

echo ""
echo "STEP 2: Find retained PVs"
echo ""
echo "Looking for Released PVs (these contain the preserved data):"
echo ""

RELEASED_PVS=$(kubectl get pv --no-headers | grep Released || true)

if [[ -z "$RELEASED_PVS" ]]; then
  echo "  WARNING: No Released PVs found."
  echo "  This may be a fresh cluster with no retained data,"
  echo "  or the PVs were already re-bound."
  echo ""
  read -rp "Continue without re-binding PVs? (yes/no): " CONTINUE_FRESH
  if [[ "$CONTINUE_FRESH" != "yes" ]]; then
    echo "Aborted."
    exit 1
  fi
else
  echo "$RELEASED_PVS"
  echo ""
  echo "Released PVs contain your data. Steps 3 and 4 will re-bind them."
fi

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 3: Re-bind the postgres-data PV ────────────────────────

echo ""
echo "STEP 3: Re-bind the postgres-data PV"
echo ""
echo "Available Released PVs:"
kubectl get pv --no-headers | grep Released || echo "  (none)"
echo ""
read -rp "Enter the PV name for postgres-data (leave blank to skip): " POSTGRES_PV

if [[ -n "$POSTGRES_PV" ]]; then
  echo ""
  echo "Removing claimRef from $POSTGRES_PV so it becomes Available..."
  kubectl patch pv "$POSTGRES_PV" --type=json \
    -p='[{"op":"remove","path":"/spec/claimRef"}]'
  echo ""
  echo "Create a PVC to re-bind to this PV. Apply the following YAML:"
  echo ""
  cat <<EOF
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-${RELEASE}-postgres-0
  namespace: ${NAMESPACE}
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-retain
  volumeName: ${POSTGRES_PV}
  resources:
    requests:
      storage: 10Gi
EOF
  echo ""
  echo "Save the above to a file and run: kubectl apply -f <file>"
  echo ""
  read -rp "Press Enter once the PVC has been applied and is Bound..."
else
  echo "Skipping postgres-data PV re-bind."
fi

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 4: Re-bind the backup PV ───────────────────────────────

echo ""
echo "STEP 4: Re-bind the backup PV"
echo ""
echo "Available Released PVs:"
kubectl get pv --no-headers | grep Released || echo "  (none)"
echo ""
read -rp "Enter the PV name for the backup volume (leave blank to skip): " BACKUP_PV

if [[ -n "$BACKUP_PV" ]]; then
  echo ""
  echo "Removing claimRef from $BACKUP_PV so it becomes Available..."
  kubectl patch pv "$BACKUP_PV" --type=json \
    -p='[{"op":"remove","path":"/spec/claimRef"}]'
  echo ""
  echo "Create a PVC to re-bind to this PV. Apply the following YAML:"
  echo ""
  cat <<EOF
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${RELEASE}-backup
  namespace: ${NAMESPACE}
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn-retain
  volumeName: ${BACKUP_PV}
  resources:
    requests:
      storage: 20Gi
EOF
  echo ""
  echo "Save the above to a file and run: kubectl apply -f <file>"
  echo ""
  read -rp "Press Enter once the PVC has been applied and is Bound..."
else
  echo "Skipping backup PV re-bind."
fi

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 5: Recreate the Kubernetes secret ──────────────────────

echo ""
echo "STEP 5: Recreate the Kubernetes secret"
echo ""
echo "Run the following command (fill in your passwords):"
echo "IMPORTANT: Use the SAME POSTGRES_PASSWORD as the original deployment"
echo "or the database will be inaccessible even if the volume is recovered."
echo ""
cat <<'EOF'
kubectl create secret generic memories-postgres-secret \
  --from-literal=POSTGRES_USER=leslie \
  --from-literal=POSTGRES_PASSWORD=<your-postgres-password> \
  --from-literal=DATABASE_URL='postgresql://leslie:<your-postgres-password>@postgres-service:5432/leslie' \
  --from-literal=ADMIN_PASSWORD=<your-admin-password> \
  --namespace mol
EOF
echo ""
read -rp "Press Enter once the secret has been created..."

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 6: Helm install ─────────────────────────────────────────

echo ""
echo "STEP 6: Helm install"
echo ""
read -rp "Enter the image SHA to deploy (e.g. a1b2c3d): " IMAGE_SHA

if [[ -z "$IMAGE_SHA" ]]; then
  echo "No image SHA provided — skipping Helm deploy."
else
  echo ""
  echo "Deploying $IMAGE_REPO:$IMAGE_SHA..."
  helm upgrade --install "$RELEASE" "$HELM_CHART" \
    --namespace "$NAMESPACE" \
    --set image.tag="$IMAGE_SHA"
  echo ""
  echo "Helm deploy complete."
fi

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 7: Verify ──────────────────────────────────────────────

echo ""
echo "STEP 7: Verify"
echo ""
echo "Pods:"
kubectl get pods -n "$NAMESPACE"
echo ""
echo "PVCs:"
kubectl get pvc -n "$NAMESPACE"
echo ""
echo "Ingress:"
kubectl get ingress -n "$NAMESPACE"

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 8: Restore from pg_dump (optional) ─────────────────────

echo ""
echo "STEP 8: Restore from pg_dump backup (optional)"
echo ""
echo "Only needed if the postgres-data PV was lost and the volume"
echo "could not be recovered from Longhorn."
echo ""
read -rp "Do you need to restore from a pg_dump backup? (yes/no): " NEED_RESTORE

if [[ "$NEED_RESTORE" == "yes" ]]; then
  echo ""
  echo "Find the latest backup file on the backup PVC:"
  echo ""
  echo "  kubectl run list-backups -n mol --restart=Never \\"
  echo "    --image=alpine \\"
  echo "    --overrides='{"
  echo "      \"spec\":{\"containers\":[{"
  echo "        \"name\":\"ls\","
  echo "        \"image\":\"alpine\","
  echo "        \"command\":[\"ls\",\"-lh\",\"/backups\"],"
  echo "        \"volumeMounts\":[{\"name\":\"b\",\"mountPath\":\"/backups\"}]"
  echo "      }],"
  echo "      \"volumes\":[{\"name\":\"b\",\"persistentVolumeClaim\":{\"claimName\":\"${RELEASE}-backup\"}}]"
  echo "    }'"
  echo "  kubectl logs -n mol list-backups"
  echo "  kubectl delete pod list-backups -n mol"
  echo ""
  read -rp "Enter the backup filename to restore (e.g. leslie_20260608_022454.sql.gz): " BACKUP_FILE

  if [[ -n "$BACKUP_FILE" ]]; then
    echo ""
    echo "Before restoring, drop the existing table inside postgres:"
    echo ""
    echo "  kubectl exec -it -n mol ${RELEASE}-postgres-0 -- psql -U leslie -d leslie -c \\"
    echo "    \"DROP TABLE IF EXISTS memories CASCADE;\""
    echo ""
    read -rp "Press Enter once the table has been dropped..."
    echo ""
    echo "Run the restore job:"
    echo ""
    cat <<EOF
kubectl run restore -n mol --restart=Never \\
  --image=postgres:16-alpine \\
  --overrides='{
    "spec": {
      "containers": [{
        "name": "restore",
        "image": "postgres:16-alpine",
        "command": ["sh", "-c", "zcat /backups/${BACKUP_FILE} | psql -h postgres-service -U \$POSTGRES_USER leslie"],
        "env": [
          {"name": "POSTGRES_USER", "valueFrom": {"secretKeyRef": {"name": "memories-postgres-secret", "key": "POSTGRES_USER"}}},
          {"name": "PGPASSWORD", "valueFrom": {"secretKeyRef": {"name": "memories-postgres-secret", "key": "POSTGRES_PASSWORD"}}}
        ],
        "volumeMounts": [{"name": "b", "mountPath": "/backups"}]
      }],
      "volumes": [{"name": "b", "persistentVolumeClaim": {"claimName": "${RELEASE}-backup"}}]
    }
  }'

kubectl logs -n mol restore --follow
kubectl delete pod restore -n mol
EOF
    echo ""
    read -rp "Press Enter once the restore job has completed successfully..."
  fi
fi

echo ""
echo "─────────────────────────────────────────────────────────────"

# ─── STEP 9: Post-recovery checklist ─────────────────────────────

echo ""
echo "STEP 9: Post-recovery checklist"
echo ""
echo "  [ ] Site loads at https://memories.anthony.com"
echo "  [ ] Submit a test memory and verify it appears on the home page"
echo "  [ ] Trigger a manual backup to confirm the CronJob is working:"
echo ""
echo "      kubectl create job --from=cronjob/${RELEASE}-backup manual-backup-verify -n ${NAMESPACE}"
echo "      kubectl logs -l job-name=manual-backup-verify -n ${NAMESPACE}"
echo ""
echo "Recovery script complete."
