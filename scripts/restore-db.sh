#!/usr/bin/env bash
# restore-db.sh — restore memories table from a backup file on the backup PVC
# Usage: ./scripts/restore-db.sh <backup-filename>
# Example: ./scripts/restore-db.sh leslie_20260608_155101.sql.gz

set -euo pipefail

BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage: ./scripts/restore-db.sh <backup-filename>"
  echo ""
  echo "To list available backups, run: ./scripts/list-backups.sh"
  exit 1
fi

echo "Dropping existing memories table (if any)..."
kubectl exec -n mol memories-of-leslie-postgres-0 -- \
  psql -U leslie -d leslie -c "DROP TABLE IF EXISTS memories CASCADE;"

echo "Restoring from $BACKUP_FILE..."
kubectl run db-restore -n mol --restart=Never \
  --image=postgres:16-alpine \
  --overrides="{
    \"spec\": {
      \"containers\": [{
        \"name\": \"restore\",
        \"image\": \"postgres:16-alpine\",
        \"command\": [\"sh\", \"-c\", \"zcat /backups/${BACKUP_FILE} | psql -h postgres-service -U \$POSTGRES_USER leslie\"],
        \"env\": [
          {\"name\": \"POSTGRES_USER\", \"valueFrom\": {\"secretKeyRef\": {\"name\": \"memories-postgres-secret\", \"key\": \"POSTGRES_USER\"}}},
          {\"name\": \"PGPASSWORD\", \"valueFrom\": {\"secretKeyRef\": {\"name\": \"memories-postgres-secret\", \"key\": \"POSTGRES_PASSWORD\"}}}
        ],
        \"volumeMounts\": [{\"name\": \"b\", \"mountPath\": \"/backups\"}]
      }],
      \"volumes\": [{\"name\": \"b\", \"persistentVolumeClaim\": {\"claimName\": \"memories-of-leslie-backup\"}}]
    }
  }"

echo "Waiting for restore to complete..."
kubectl wait --for=jsonpath='{.status.phase}'=Succeeded pod/db-restore -n mol --timeout=120s

echo "Restore logs:"
kubectl logs db-restore -n mol

kubectl delete pod db-restore -n mol

echo "Done. Memories table restored from $BACKUP_FILE."
