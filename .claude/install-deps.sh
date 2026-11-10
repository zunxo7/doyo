#!/usr/bin/env bash
# Cloud sessions start from a fresh checkout with no node_modules.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR/frontend" && npm ci --no-audit --no-fund
cd "$CLAUDE_PROJECT_DIR/backend" && npm ci --no-audit --no-fund
