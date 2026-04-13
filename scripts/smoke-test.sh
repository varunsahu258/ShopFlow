#!/usr/bin/env bash
# scripts/smoke-test.sh
# Run after Kubernetes deploy to verify the stack is live
set -euo pipefail

BASE_URL="${SMOKE_TEST_URL:-https://shopflow.example.com}"
API_URL="${SMOKE_TEST_API_URL:-https://api.shopflow.example.com}"
MAX_RETRIES=12
SLEEP=10

log() { echo "[$(date '+%H:%M:%S')] $*"; }
fail() { echo "❌  SMOKE TEST FAILED: $*" >&2; exit 1; }

# ── Retry helper ──────────────────────────────────────────────────────────────
check_url() {
    local url="$1"
    local desc="$2"
    local expected="${3:-200}"
    for i in $(seq 1 $MAX_RETRIES); do
        STATUS=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" || echo "000")
        if [ "$STATUS" = "$expected" ]; then
            log "✅  $desc → HTTP $STATUS"
            return 0
        fi
        log "⏳  $desc → HTTP $STATUS (attempt $i/$MAX_RETRIES)"
        sleep $SLEEP
    done
    fail "$desc returned HTTP $STATUS after $MAX_RETRIES retries"
}

# ── Tests ─────────────────────────────────────────────────────────────────────
log "Starting smoke tests against $BASE_URL ..."

check_url "$BASE_URL"                    "Frontend home page"
check_url "$API_URL/health/live"         "Backend liveness"
check_url "$API_URL/health/ready"        "Backend readiness"
check_url "$API_URL/api/products"        "Products API"
check_url "$API_URL/metrics"             "Prometheus metrics"

# Verify products endpoint returns JSON with data
PRODUCTS=$(curl -sSf "$API_URL/api/products" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('products',[])))") || fail "Products API response invalid"
if [ "$PRODUCTS" -lt 1 ]; then
    fail "Products API returned 0 products"
fi
log "✅  Products API returned $PRODUCTS products"

log ""
log "🎉  All smoke tests passed!"
