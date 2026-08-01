#!/usr/bin/env bash
#
# Safe VPS deployment for SNT Education LMS.
#
# Usage on the VPS:
#   cd /home/mahendra/apps/snteducation
#   bash scripts/deploy-vps.sh
#
# Optional overrides:
#   BRANCH=main PM2_APP=snt-api APP_USER=mahendra bash scripts/deploy-vps.sh
#   ALLOW_MERGE=true bash scripts/deploy-vps.sh
#
# The default Git mode is fast-forward only. If the VPS branch has local-only
# commits or divergence, this script stops and prints safe next steps. It never
# force-pushes, resets, rebases, or deletes Git history.

set -Eeuo pipefail
IFS=$'\n\t'

APP_DIR="${APP_DIR:-/home/mahendra/apps/snteducation}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
PM2_APP="${PM2_APP:-snt-api}"
APP_USER="${APP_USER:-mahendra}"

BACKEND_DIR="${BACKEND_DIR:-$APP_DIR/backend}"
PM2_ENTRY="${PM2_ENTRY:-dist/server.js}"
PM2_CWD="${PM2_CWD:-$BACKEND_DIR}"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_DIR/fontend}"
FRONTEND_DIST="${FRONTEND_DIST:-$FRONTEND_DIR/dist/snt-frontend/browser}"
PUBLIC_ROOT="${PUBLIC_ROOT:-/var/www/28479f79-f545-4a5b-90d3-ecdeea3a3ccb/public_html}"
FRONTEND_BACKUP_ROOT="${FRONTEND_BACKUP_ROOT:-/home/mahendra/backups/snteducation/frontend}"

# Set ALLOW_MERGE=true only when you intentionally want the VPS to create a
# normal merge commit that preserves both local VPS commits and origin/main.
ALLOW_MERGE="${ALLOW_MERGE:-false}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\nERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

run() {
  log "$*"
  "$@"
}

run_pm2() {
  log "pm2 $* (as $APP_USER)"
  local quoted_cwd quoted_args
  printf -v quoted_cwd '%q' "$PM2_CWD"
  printf -v quoted_args '%q ' "$@"

  if [[ "$(id -un)" == "$APP_USER" ]]; then
    (cd "$PM2_CWD" && pm2 "$@")
    return
  fi

  sudo -H -u "$APP_USER" bash -lc "cd $quoted_cwd && pm2 $quoted_args"
}

pm2_app_exists() {
  local quoted_cwd quoted_app
  printf -v quoted_cwd '%q' "$PM2_CWD"
  printf -v quoted_app '%q' "$PM2_APP"

  if [[ "$(id -un)" == "$APP_USER" ]]; then
    (cd "$PM2_CWD" && pm2 describe "$PM2_APP" >/dev/null 2>&1)
    return
  fi

  sudo -H -u "$APP_USER" bash -lc "cd $quoted_cwd && pm2 describe $quoted_app >/dev/null 2>&1"
}

restart_or_start_pm2() {
  if pm2_app_exists; then
    run_pm2 restart "$PM2_APP" --update-env
  else
    log "PM2 app '$PM2_APP' was not found for user '$APP_USER'; starting $PM2_ENTRY"
    run_pm2 start "$PM2_ENTRY" --name "$PM2_APP" --update-env
  fi
}

on_error() {
  local exit_code=$?
  printf '\nDeployment stopped safely at line %s with exit code %s.\n' "${BASH_LINENO[0]}" "$exit_code" >&2
  printf 'No Git reset/force operation was run. Review the error above before retrying.\n' >&2
  exit "$exit_code"
}
trap on_error ERR

require_cmd git
require_cmd npm
require_cmd npx
require_cmd rsync
if [[ "$(id -un)" == "$APP_USER" ]]; then
  require_cmd pm2
else
  require_cmd sudo
  sudo -H -u "$APP_USER" bash -lc 'command -v pm2 >/dev/null 2>&1' || fail "pm2 is not available for APP_USER=$APP_USER"
fi

[[ -d "$APP_DIR/.git" ]] || fail "APP_DIR is not a Git repo: $APP_DIR"
[[ -d "$BACKEND_DIR" ]] || fail "Backend dir not found: $BACKEND_DIR"
[[ -d "$FRONTEND_DIR" ]] || fail "Frontend dir not found: $FRONTEND_DIR"
[[ -d "$PUBLIC_ROOT" ]] || fail "Public root not found: $PUBLIC_ROOT"

cd "$APP_DIR"

log "Starting SNT deployment"
printf 'Repo: %s\nBranch: %s\nPM2 app: %s\nPM2 user: %s\nPM2 cwd: %s\nPM2 entry: %s\nPublic root: %s\n' "$APP_DIR" "$BRANCH" "$PM2_APP" "$APP_USER" "$PM2_CWD" "$PM2_ENTRY" "$PUBLIC_ROOT"

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$BRANCH" ]] || fail "Expected branch '$BRANCH' but current branch is '$current_branch'."

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  fail "Working tree has uncommitted changes. Commit, stash, or resolve them before deploying."
fi

run git fetch --prune "$REMOTE"

local_commit="$(git rev-parse HEAD)"
remote_commit="$(git rev-parse "$REMOTE/$BRANCH")"
merge_base="$(git merge-base HEAD "$REMOTE/$BRANCH")"

if [[ "$local_commit" == "$remote_commit" ]]; then
  log "Git is already up to date at $local_commit"
elif [[ "$local_commit" == "$merge_base" ]]; then
  run git merge --ff-only "$REMOTE/$BRANCH"
elif [[ "$remote_commit" == "$merge_base" ]]; then
  log "Local branch is ahead of $REMOTE/$BRANCH; preserving local commit(s) and deploying current HEAD."
else
  if [[ "$ALLOW_MERGE" == "true" ]]; then
    run git merge --no-edit "$REMOTE/$BRANCH"
  else
    git log --oneline --left-right --graph HEAD..."$REMOTE/$BRANCH" || true
    fail "Local and remote branches diverged. To preserve both, inspect the commits and rerun with ALLOW_MERGE=true, or manually merge $REMOTE/$BRANCH into $BRANCH. This script will not force/reset."
  fi
fi

deploy_commit="$(git rev-parse HEAD)"
log "Deploying commit $deploy_commit"

log "Installing backend dependencies"
cd "$BACKEND_DIR"
run npm ci
run npx prisma migrate deploy
run npm run db:generate
run npm run build

log "Restarting backend PM2 app"
restart_or_start_pm2
run_pm2 save

log "Installing frontend dependencies"
cd "$FRONTEND_DIR"
run npm ci
run npm run build
[[ -d "$FRONTEND_DIST" ]] || fail "Frontend build output not found: $FRONTEND_DIST"

timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_dir="$FRONTEND_BACKUP_ROOT/$timestamp"
log "Backing up current frontend to $backup_dir"
run mkdir -p "$backup_dir"
run rsync -a "$PUBLIC_ROOT"/ "$backup_dir"/

log "Publishing frontend build"
run rsync -a --delete --exclude='.htaccess' "$FRONTEND_DIST"/ "$PUBLIC_ROOT"/

log "Verification"
cd "$APP_DIR"
printf 'Git HEAD: %s\n' "$(git rev-parse --short HEAD)"
printf 'Backend PM2 status:\n'
run_pm2 status "$PM2_APP" || true
printf '\nFrontend index:\n'
ls -lah "$PUBLIC_ROOT/index.html"
printf '\nFrontend asset count:\n'
find "$PUBLIC_ROOT" -maxdepth 2 -type f | wc -l
printf '\nRecent public root files:\n'
find "$PUBLIC_ROOT" -maxdepth 1 -type f -printf '%TY-%Tm-%Td %TH:%TM %p\n' | sort | tail -20

log "Deployment completed successfully"
