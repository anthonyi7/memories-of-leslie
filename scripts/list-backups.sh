#!/usr/bin/env bash
# list-backups.sh — list backup files on the backup PVC

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

kubectl run list-backups-tmp -n mol --restart=Never \
  --image=alpine \
  --overrides='{"spec":{"containers":[{"name":"ls","image":"alpine","command":["ls","-lh","/backups"],"volumeMounts":[{"name":"b","mountPath":"/backups"}]}],"volumes":[{"name":"b","persistentVolumeClaim":{"claimName":"memories-of-leslie-backup"}}]}}'

echo "Waiting..."
kubectl wait --for=condition=ready pod/list-backups-tmp -n mol --timeout=60s 2>/dev/null || true
sleep 2

kubectl logs list-backups-tmp -n mol
kubectl delete pod list-backups-tmp -n mol
