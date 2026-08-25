#!/bin/bash
# ============================================================
# AGENDA ESCOLAR DIGITAL — Production Smoke Test
# ============================================================
#
# Validates production deployment with safe read-only checks.
#
# Usage:
#   SMOKE_TEST_BASE_URL=https://your-domain.com \
#   SMOKE_TEST_API_URL=https://api.your-domain.com/api/v1 \
#   SMOKE_TEST_EMAIL=admin@demo-school.dev \
#   SMOKE_TEST_PASSWORD=Demo1234! \
#   ./scripts/smoke-test.sh
#
# Requirements: curl, jq
# ============================================================

set -euo pipefail

# --- Configuration ---
BASE_URL="${SMOKE_TEST_BASE_URL:?ERROR: SMOKE_TEST_BASE_URL is required}"
API_URL="${SMOKE_TEST_API_URL:?ERROR: SMOKE_TEST_API_URL is required}"
EMAIL="${SMOKE_TEST_EMAIL:?ERROR: SMOKE_TEST_EMAIL is required}"
PASSWORD="${SMOKE_TEST_PASSWORD:?ERROR: SMOKE_TEST_PASSWORD is required}"

PASS=0
FAIL=0
TOTAL=0

# --- Helpers ---
pass() { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); echo "  PASS  $1"; }
fail() { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); echo "  FAIL  $1"; }

# Never print passwords or tokens in output
TOKEN=""

echo "========================================="
echo " AGENDA ESCOLAR DIGITAL — Smoke Tests"
echo "========================================="
echo "API:  $API_URL"
echo "Web:  $BASE_URL"
echo ""

# --- 1. Health ---
echo "=== HEALTH ==="
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
  pass "API liveness"
else
  fail "API liveness"
fi

if curl -sf "${API_URL}/health/readiness" > /dev/null 2>&1; then
  pass "API readiness"
else
  fail "API readiness"
fi

# --- 2. Web ---
echo "=== WEB ==="
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Web SPA loads"
else
  fail "Web SPA loads (HTTP $HTTP_CODE)"
fi

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/login" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  pass "Web SPA fallback"
else
  fail "Web SPA fallback (HTTP $HTTP_CODE)"
fi

# --- 3. Auth ---
echo "=== AUTH ==="
LOGIN_RESPONSE=$(curl -sf -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" 2>/dev/null || echo "{}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty' 2>/dev/null || echo "")
if [ -n "$TOKEN" ]; then
  pass "Login valid"
else
  fail "Login valid"
fi

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"${EMAIL}"'","password":"wrongpassword"}' 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
  pass "Login invalid rejected"
else
  fail "Login invalid rejected (HTTP $HTTP_CODE)"
fi

if [ -n "$TOKEN" ]; then
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${API_URL}/auth/profile" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    pass "Profile with token"
  else
    fail "Profile with token (HTTP $HTTP_CODE)"
  fi
fi

# --- 4. Security ---
echo "=== SECURITY ==="
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${API_URL}/students" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
  pass "No auth → 401"
else
  fail "No auth → 401 (HTTP $HTTP_CODE)"
fi

HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${API_URL}/students" \
  -H "Authorization: Bearer invalid-token" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "401" ]; then
  pass "Invalid token → 401"
else
  fail "Invalid token → 401 (HTTP $HTTP_CODE)"
fi

# --- 5. Core Endpoints ---
echo "=== CORE ENDPOINTS ==="
if [ -n "$TOKEN" ]; then
  for EP in students courses subjects grades schedules tasks communications notifications signature-requests school-grades academic-periods enrollments teacher-assignments guardians/students users communication-recipients task-assignments; do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "${API_URL}/${EP}" \
      -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      pass "$EP"
    else
      fail "$EP (HTTP $HTTP_CODE)"
    fi
  done
fi

# --- 6. Agenda ---
echo "=== AGENDA ==="
if [ -n "$TOKEN" ]; then
  RESPONSE=$(curl -sf "${API_URL}/agenda?start=2026-08-24&end=2026-08-30" \
    -H "Authorization: Bearer ${TOKEN}" 2>/dev/null || echo "{}")
  TOTAL_EVENTS=$(echo "$RESPONSE" | jq -r '.total // 0' 2>/dev/null || echo "0")
  if [ "$TOTAL_EVENTS" -gt 0 ] 2>/dev/null; then
    pass "Agenda week (events: $TOTAL_EVENTS)"
  else
    fail "Agenda week"
  fi
fi

# --- 7. Security Headers ---
echo "=== SECURITY HEADERS ==="
HEADERS=$(curl -sf -I "${BASE_URL}/" 2>/dev/null || echo "")
if echo "$HEADERS" | grep -qi "x-frame-options"; then
  pass "X-Frame-Options"
else
  fail "X-Frame-Options"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  pass "X-Content-Type-Options"
else
  fail "X-Content-Type-Options"
fi

if echo "$HEADERS" | grep -qi "referrer-policy"; then
  pass "Referrer-Policy"
else
  fail "Referrer-Policy"
fi

# --- Summary ---
echo ""
echo "========================================="
echo " RESULTS: ${PASS} PASS / ${FAIL} FAIL / ${TOTAL} TOTAL"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo " STATUS: SOME CHECKS FAILED"
  exit 1
else
  echo " STATUS: ALL CHECKS PASSED"
  exit 0
fi
