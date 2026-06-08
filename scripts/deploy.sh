#!/usr/bin/env bash
# deploy.sh — build, push, and deploy memories-of-leslie to the active cluster
#
# Usage: ./scripts/deploy.sh "your commit message"
#
# Requires: docker, kubectl, helm, git, and an active GHCR login.
# Must be run from the dev/ directory.

set -euo pipefail

# Always run from dev/ regardless of where the script is called from
cd "$(dirname "${BASH_SOURCE[0]}")/.."

NAMESPACE="mol"
RELEASE="memories-of-leslie"
HELM_CHART="./k8s"
IMAGE_REPO="ghcr.io/anthonyi7/memories-of-leslie"

if [[ -z "${1:-}" ]]; then
  echo "Usage: ./scripts/deploy.sh \"your commit message\""
  exit 1
fi

COMMIT_MSG="$1"

# Commit and push
git add .
git commit -m "$COMMIT_MSG"
git push

# Capture SHA after commit
SHA=$(git rev-parse --short HEAD)

echo ""
echo "Building image: $IMAGE_REPO:$SHA"
docker build -t "$IMAGE_REPO:$SHA" .

echo ""
echo "Pushing image: $IMAGE_REPO:$SHA"
docker push "$IMAGE_REPO:$SHA"

echo ""
echo "Deploying $RELEASE with image tag $SHA..."
helm upgrade --install "$RELEASE" "$HELM_CHART" \
  --namespace "$NAMESPACE" \
  --set image.tag="$SHA"

echo ""
echo "Deployed: $IMAGE_REPO:$SHA"
