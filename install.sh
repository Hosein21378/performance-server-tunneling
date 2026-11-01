#!/usr/bin/env bash
# =============================================================================
#  Rabt panel installer
#  Unattended one-line install for Debian/Ubuntu and RHEL-family servers.
#
#  نصب تک‌خطی — این دستور را روی سرور اجرا کنید:
#
#    curl -fsSL https://raw.githubusercontent.com/Hosein21378/performance-server-tunneling/main/install.sh | sudo bash
#
#  If raw.githubusercontent.com is not reachable from the server, use git:
#
#    git clone --depth 1 https://github.com/Hosein21378/performance-server-tunneling.git /tmp/rabt-src && sudo bash /tmp/rabt-src/install.sh
#
#  Optional settings (put them after sudo, e.g. "... | sudo APP_PORT=8080 bash"):
#    APP_PORT        Panel port                                  (default: 3000)
#    APP_HOST        Bind address; 127.0.0.1 for proxy/SSH only  (default: 0.0.0.0)
#    ADMIN_PASSWORD  Custom panel password, 8-128 chars of A-Z a-z 0-9 . _ @ % + = : , -
#    APP_DIR         Install directory                           (default: /opt/rabt-panel)
#    NPM_REGISTRY    npm registry mirror when registry.npmjs.org is unreachable
#    NODE_MIRROR     Node.js download mirror                     (default: https://nodejs.org/dist)
#    RABT_REPO       Git repository to install from
#    RABT_BRANCH     Git branch                                  (default: main)
#
#  Re-running the installer upgrades the panel and keeps the existing password.
# =============================================================================
set -Eeuo pipefail

RABT_SCRIPT_PATH="${BASH_SOURCE[0]:-}"

RABT_REPO="${RABT_REPO:-https://github.com/Hosein21378/performance-server-tunneling.git}"
RABT_BRANCH="${RABT_BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/rabt-panel}"
APP_PORT="${APP_PORT:-3000}"
APP_HOST="${APP_HOST:-0.0.0.0}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
DB_NAME="${DB_NAME:-rabt_panel}"
DB_USER="${DB_USER:-rabt}"
SERVICE_NAME="${SERVICE_NAME:-rabt-panel}"
SERVICE_USER="${SERVICE_USER:-rabt-panel}"
NODE_MAJOR="${NODE_MAJOR:-22}"
NODE_MIRROR="${NODE_MIRROR:-https://nodejs.org/dist}"
NODE_FALLBACK_VERSION="${NODE_FALLBACK_VERSION:-v22.14.0}"
NODE_HOME="${NODE_HOME:-/usr/local/lib/rabt-node}"
NPM_REGISTRY="${NPM_REGISTRY:-}"
LOG_FILE="${LOG_FILE:-/var/log/rabt-panel-install.log}"

PKG=""
LOCAL_SOURCE=""
DB_PASS=""
SESSION_SECRET_VALUE=""
PASSWORD_STATE="new"
HARDENING="full"

if [[ -t 1 ]]; then
  C_BOLD=$'\033[1m'; C_BLUE=$'\033[1;34m'; C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'; C_RED=$'\033[1;31m'; C_RESET=$'\033[0m'
else
  C_BOLD=''; C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_RESET=''
fi

# ------------------------------------------------------------------ output ---
step() { printf '\n%s==>%s %s%s%s\n' "${C_BLUE}" "${C_RESET}" "${C_BOLD}" "$*" "${C_RESET}"; }
ok()   { printf '    %s✓%s %s\n' "${C_GREEN}" "${C_RESET}" "$*"; }
info() { printf '    … %s\n' "$*"; }
warn() { printf '    %s!%s %s\n' "${C_YELLOW}" "${C_RESET}" "$*" >&2; }
fail() { printf '\n%sERROR:%s %s\n' "${C_RED}" "${C_RESET}" "$*" >&2; exit 1; }

on_error() {
  local code=$? line="${1:-?}"
  printf '\n%sERROR:%s installer stopped at line %s (exit code %s).\n' "${C_RED}" "${C_RESET}" "${line}" "${code}" >&2
  if [[ -s "${LOG_FILE}" ]]; then
    printf 'Last lines of %s:\n' "${LOG_FILE}" >&2
    tail -n 25 "${LOG_FILE}" >&2 || true
  fi
  exit "${code}"
}

# Runs a command with its output in the log file and stdin detached, so that
# nothing can swallow the rest of a script that is piped into bash.
run_logged() {
  local title="$1"
  shift
  info "${title}"
  printf '\n===== %s | %s =====\n' "$(date -u +%H:%M:%S)" "${title}" >>"${LOG_FILE}"
  if ! "$@" >>"${LOG_FILE}" 2>&1 </dev/null; then
    printf '\n----- last 40 lines of %s -----\n' "${LOG_FILE}" >&2
    tail -n 40 "${LOG_FILE}" >&2 || true
    fail "${title} failed. Full log: ${LOG_FILE}"
  fi
  ok "${title}"
}

# ----------------------------------------------------------------- helpers ---
gen_hex() {
  local raw
  raw="$(openssl rand -hex 64)"
  printf '%s' "${raw:0:${1:-32}}"
}

# Alphanumeric password without look-alike characters (0/O, 1/l/I).
gen_password() {
  local raw
  raw="$(openssl rand -base64 120 | tr -dc 'A-HJ-NP-Za-km-z2-9')"
  printf '%s' "${raw:0:${1:-20}}"
}

read_env_value() {
  local file="$1" key="$2"
  [[ -f "${file}" ]] || return 0
  { grep -E "^${key}=" "${file}" || true; } | tail -n 1 | cut -d= -f2-
}

run_as_postgres() {
  if command -v runuser >/dev/null 2>&1; then
    (cd / && runuser -u postgres -- "$@")
  elif command -v sudo >/dev/null 2>&1; then
    (cd / && sudo -n -u postgres -- "$@")
  else
    (cd / && su -s /bin/sh postgres -c "$(printf '%q ' "$@")")
  fi
}

# SQL is always passed on stdin or as arguments, never through temp files.
psql_admin() { run_as_postgres psql -X -q -v ON_ERROR_STOP=1 "$@"; }

port_in_use() {
  command -v ss >/dev/null 2>&1 || return 1
  [[ -n "$(ss -H -ltn "sport = :${APP_PORT}" 2>/dev/null || true)" ]]
}

# Prints the directory that contains package.json + src/ (repo root or one level deeper).
resolve_project_root() {
  local base="$1" candidate
  if [[ -f "${base}/package.json" && -d "${base}/src" ]]; then
    printf '%s\n' "${base}"
    return 0
  fi
  for candidate in "${base}"/*/; do
    candidate="${candidate%/}"
    [[ "$(basename "${candidate}")" == "node_modules" ]] && continue
    if [[ -f "${candidate}/package.json" && -d "${candidate}/src" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done
  return 1
}

# Prepends a narrowly scoped password rule for the panel database to pg_hba.conf.
ensure_hba_rule() {
  local hba="$1" db="$2" user="$3" method="$4" tmp
  local marker="# rabt-panel: ${db}/${user}"
  [[ -f "${hba}" ]] || return 1
  if grep -qF "${marker}" "${hba}"; then
    return 0
  fi
  tmp="$(mktemp)" || return 1
  {
    printf '%s\n' "${marker}"
    printf 'host    %s    %s    127.0.0.1/32    %s\n' "${db}" "${user}" "${method}"
    printf 'host    %s    %s    ::1/128         %s\n' "${db}" "${user}" "${method}"
    cat "${hba}"
  } >"${tmp}" || { rm -f "${tmp}"; return 1; }
  cat "${tmp}" >"${hba}" || { rm -f "${tmp}"; return 1; }
  rm -f "${tmp}"
}

health_host() {
  case "${APP_HOST}" in
    0.0.0.0|::|"[::]") printf '127.0.0.1' ;;
    *) printf '%s' "${APP_HOST}" ;;
  esac
}

wait_for_health() {
  local url
  url="http://$(health_host):${APP_PORT}/api/health"
  for _ in $(seq 1 40); do
    if curl -fsS --max-time 3 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

detect_public_ip() {
  local ip=""
  ip="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  if [[ ! "${ip}" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
    ip="$(curl -fsS --max-time 5 https://ifconfig.me/ip 2>/dev/null || true)"
  fi
  if [[ ! "${ip}" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  printf '%s' "${ip:-SERVER_IP}"
}

# ------------------------------------------------------------------- steps ---
require_root() {
  [[ "${EUID}" -eq 0 ]] || fail "Run this installer as root, e.g.: curl -fsSL <url>/install.sh | sudo bash"
}

validate_inputs() {
  if ! [[ "${APP_PORT}" =~ ^[0-9]{1,5}$ ]] || (( 10#${APP_PORT} < 1 || 10#${APP_PORT} > 65535 )); then
    fail "APP_PORT must be a number between 1 and 65535."
  fi
  [[ "${DB_NAME}" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || fail "DB_NAME may contain only lowercase letters, digits and underscores."
  [[ "${DB_USER}" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || fail "DB_USER may contain only lowercase letters, digits and underscores."
  [[ "${SERVICE_NAME}" =~ ^[A-Za-z0-9_.-]{1,64}$ ]] || fail "SERVICE_NAME contains invalid characters."
  [[ "${SERVICE_USER}" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || fail "SERVICE_USER contains invalid characters."
  [[ "${APP_HOST}" =~ ^[0-9A-Fa-f:.]+$ ]] || fail "APP_HOST must be an IP address such as 0.0.0.0 or 127.0.0.1."
  [[ "${APP_DIR}" =~ ^/[A-Za-z0-9._-]+(/[A-Za-z0-9._-]+)+$ ]] \
    || fail "APP_DIR must be an absolute path with at least two levels, e.g. /opt/rabt-panel."
  case "${APP_DIR}" in
    /usr/*|/etc/*|/bin/*|/sbin/*|/lib*|/boot/*|/proc/*|/sys/*|/dev/*|/run/*|/var/lib/postgresql*|/var/lib/pgsql*)
      fail "Refusing to install into the system directory ${APP_DIR}." ;;
  esac
  if [[ -n "${ADMIN_PASSWORD}" && ! "${ADMIN_PASSWORD}" =~ ^[A-Za-z0-9._@%+=:,-]{8,128}$ ]]; then
    fail "ADMIN_PASSWORD must be 8-128 characters using only: A-Z a-z 0-9 . _ @ % + = : , -"
  fi
}

init_log() {
  mkdir -p "$(dirname "${LOG_FILE}")"
  : >"${LOG_FILE}"
  chmod 600 "${LOG_FILE}"
  printf 'Rabt installer log - %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"${LOG_FILE}"
}

detect_local_source() {
  LOCAL_SOURCE=""
  if [[ "${RABT_FORCE_GIT:-0}" == "1" ]]; then
    return 0
  fi
  if [[ -n "${RABT_SCRIPT_PATH}" && -f "${RABT_SCRIPT_PATH}" ]]; then
    local dir
    dir="$(cd "$(dirname "${RABT_SCRIPT_PATH}")" && pwd)"
    if [[ -f "${dir}/package.json" && -d "${dir}/src" ]]; then
      LOCAL_SOURCE="${dir}"
    fi
  fi
  return 0
}

detect_platform() {
  if command -v apt-get >/dev/null 2>&1; then
    PKG="apt"
  elif command -v dnf >/dev/null 2>&1; then
    PKG="dnf"
  elif command -v yum >/dev/null 2>&1; then
    PKG="yum"
  else
    fail "Unsupported OS: apt-get, dnf or yum is required (Debian/Ubuntu or RHEL family)."
  fi
  local pretty="unknown"
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    pretty="$(. /etc/os-release && printf '%s' "${PRETTY_NAME:-unknown}")"
  fi
  ok "Detected ${pretty} (${PKG}, $(uname -m))"
  if [[ -n "${LOCAL_SOURCE}" ]]; then
    ok "Source: local folder ${LOCAL_SOURCE}"
  else
    ok "Source: ${RABT_REPO} (branch ${RABT_BRANCH})"
  fi
}

check_port() {
  if port_in_use; then
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet "${SERVICE_NAME}" 2>/dev/null; then
      ok "Port ${APP_PORT} belongs to the existing ${SERVICE_NAME} service (it will be upgraded)."
    else
      fail "Port ${APP_PORT} is already used by another program. Pick another port, e.g.: curl -fsSL <url>/install.sh | sudo APP_PORT=3080 bash"
    fi
  else
    ok "Port ${APP_PORT} is free."
  fi
}

install_prereqs() {
  step "1/8  Installing system packages"
  if [[ "${PKG}" == "apt" ]]; then
    export DEBIAN_FRONTEND=noninteractive
    info "apt-get update"
    if apt-get update >>"${LOG_FILE}" 2>&1 </dev/null; then
      ok "apt-get update"
    else
      warn "apt-get update reported errors; continuing with the existing package lists."
    fi
    run_logged "Install curl, git, openssl, PostgreSQL" \
      apt-get install -y --no-upgrade curl ca-certificates tar gzip openssl git iproute2 postgresql
  else
    local pkgs=(ca-certificates tar gzip openssl git iproute postgresql-server postgresql)
    command -v curl >/dev/null 2>&1 || pkgs+=(curl)
    run_logged "Install git, openssl, PostgreSQL" "${PKG}" install -y "${pkgs[@]}"
  fi
}

node_is_usable() {
  local bin real major
  bin="$(command -v node 2>/dev/null || true)"
  [[ -n "${bin}" ]] || return 1
  real="$(readlink -f "${bin}" 2>/dev/null || printf '%s' "${bin}")"
  case "${real}" in /root/*|/home/*) return 1 ;; esac
  major="$("${bin}" -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  [[ "${major}" =~ ^[0-9]+$ ]] || return 1
  (( major >= NODE_MAJOR ))
}

# Downloads the latest Node.js LTS of NODE_MAJOR and verifies its SHA-256.
# Prints the archive path. Returns 1 on download errors, 2 on checksum errors.
fetch_node_archive() {
  local tmp="$1" node_arch="$2" file="" base=""
  if curl -fsSL --retry 3 --connect-timeout 15 --max-time 120 \
      "${NODE_MIRROR}/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" -o "${tmp}/SHASUMS256.txt" 2>>"${LOG_FILE}"; then
    file="$(awk -v a="linux-${node_arch}.tar.gz" '$2 ~ ("^node-v[0-9.]+-" a "$") { print $2; exit }' "${tmp}/SHASUMS256.txt" || true)"
    base="${NODE_MIRROR}/latest-v${NODE_MAJOR}.x"
  fi
  if [[ -z "${file}" ]]; then
    base="${NODE_MIRROR}/${NODE_FALLBACK_VERSION}"
    file="node-${NODE_FALLBACK_VERSION}-linux-${node_arch}.tar.gz"
    curl -fsSL --retry 3 --connect-timeout 15 --max-time 120 \
      "${base}/SHASUMS256.txt" -o "${tmp}/SHASUMS256.txt" 2>>"${LOG_FILE}" || return 1
  fi
  curl -fsSL --retry 3 --connect-timeout 15 --max-time 900 \
    "${base}/${file}" -o "${tmp}/${file}" 2>>"${LOG_FILE}" || return 1
  (cd "${tmp}" && awk -v f="${file}" '$2 == f' SHASUMS256.txt | sha256sum -c --status -) || return 2
  printf '%s\n' "${tmp}/${file}"
}

install_node() {
  step "2/8  Preparing Node.js ${NODE_MAJOR}"
  if node_is_usable; then
    ok "Node.js $(node -v) is already installed."
    return 0
  fi
  local arch node_arch tmp archive="" status=0
  arch="$(uname -m)"
  case "${arch}" in
    x86_64|amd64) node_arch="x64" ;;
    aarch64|arm64) node_arch="arm64" ;;
    *) fail "Unsupported CPU architecture for Node.js: ${arch}" ;;
  esac
  tmp="$(mktemp -d)"
  info "Downloading Node.js ${NODE_MAJOR} for linux-${node_arch} from ${NODE_MIRROR}"
  archive="$(fetch_node_archive "${tmp}" "${node_arch}")" || status=$?
  if (( status == 2 )); then
    rm -rf "${tmp}"
    fail "Node.js checksum verification failed (corrupted or tampered download)."
  elif (( status != 0 )) || [[ -z "${archive}" ]]; then
    rm -rf "${tmp}"
    fail "Cannot download Node.js from ${NODE_MIRROR}. Set NODE_MIRROR to a reachable mirror."
  fi
  rm -rf "${NODE_HOME}"
  mkdir -p "${NODE_HOME}"
  tar -xzf "${archive}" -C "${NODE_HOME}" --strip-components=1
  rm -rf "${tmp}"
  ln -sfn "${NODE_HOME}/bin/node" /usr/local/bin/node
  ln -sfn "${NODE_HOME}/bin/npm" /usr/local/bin/npm
  ln -sfn "${NODE_HOME}/bin/npx" /usr/local/bin/npx
  hash -r
  node_is_usable || fail "Node.js was installed but cannot be executed."
  ok "Installed Node.js $(node -v) (SHA-256 verified)."
}

start_postgres() {
  step "3/8  Starting PostgreSQL"
  if pg_isready -q >/dev/null 2>&1; then
    ok "PostgreSQL is already running."
  elif [[ -d /run/systemd/system ]]; then
    if command -v postgresql-setup >/dev/null 2>&1 && [[ ! -s /var/lib/pgsql/data/PG_VERSION ]]; then
      run_logged "Initialise the PostgreSQL data directory" postgresql-setup --initdb
    fi
    run_logged "Enable and start postgresql.service" systemctl enable --now postgresql
  else
    run_logged "Start PostgreSQL" service postgresql start
  fi
  for _ in $(seq 1 30); do
    if pg_isready -q >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  pg_isready -q >/dev/null 2>&1 || fail "PostgreSQL did not become ready. Check: journalctl -u postgresql -n 50 --no-pager"
  if [[ -d /run/systemd/system ]]; then
    systemctl enable postgresql >>"${LOG_FILE}" 2>&1 || true
  fi
  ok "PostgreSQL is ready."
}

prepare_secrets() {
  local env_file="${APP_DIR}/.env" existing_pass existing_secret existing_url existing_db_pass=""
  existing_pass="$(read_env_value "${env_file}" ADMIN_PASSWORD)"
  existing_secret="$(read_env_value "${env_file}" SESSION_SECRET)"
  existing_url="$(read_env_value "${env_file}" DATABASE_URL)"
  if [[ "${existing_url}" =~ ^postgresql://${DB_USER}:([A-Za-z0-9]{16,})@127\.0\.0\.1:5432/${DB_NAME}$ ]]; then
    existing_db_pass="${BASH_REMATCH[1]}"
  fi

  if [[ -n "${ADMIN_PASSWORD}" ]]; then
    PASSWORD_STATE="custom"
  elif [[ -n "${existing_pass}" ]]; then
    ADMIN_PASSWORD="${existing_pass}"
    PASSWORD_STATE="kept"
  else
    ADMIN_PASSWORD="$(gen_password 20)"
    PASSWORD_STATE="new"
  fi
  SESSION_SECRET_VALUE="${existing_secret:-$(gen_hex 64)}"
  DB_PASS="${existing_db_pass:-$(gen_hex 32)}"
  ok "Panel password: ${PASSWORD_STATE}; database credentials prepared."
}

provision_database() {
  psql_admin >>"${LOG_FILE}" 2>&1 <<SQL
SET password_encryption = 'scram-sha-256';
\set db_user '${DB_USER}'
\set db_name '${DB_NAME}'
\set db_pass '${DB_PASS}'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_pass')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user') \gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'db_user', :'db_pass') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
 WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'db_user') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'db_name') \gexec
SQL
}

configure_pg_auth() {
  local hba version method="scram-sha-256"
  hba="$(psql_admin -tA -c 'SHOW hba_file' 2>>"${LOG_FILE}" || true)"
  hba="${hba//[[:space:]]/}"
  version="$(psql_admin -tA -c 'SHOW server_version_num' 2>>"${LOG_FILE}" || true)"
  version="${version//[[:space:]]/}"
  if [[ "${version}" =~ ^[0-9]+$ ]] && (( version < 100000 )); then
    method="md5"
  fi
  if [[ -n "${hba}" && -f "${hba}" ]]; then
    if ensure_hba_rule "${hba}" "${DB_NAME}" "${DB_USER}" "${method}"; then
      psql_admin -tA -c 'SELECT pg_reload_conf()' >>"${LOG_FILE}" 2>&1 || true
      ok "Password login on 127.0.0.1 enabled for ${DB_USER} (${method})."
    else
      warn "Could not update ${hba}; keeping the default PostgreSQL authentication rules."
    fi
  else
    warn "pg_hba.conf not found; keeping the default PostgreSQL authentication rules."
  fi
}

verify_db_login() {
  for _ in $(seq 1 10); do
    if PGPASSWORD="${DB_PASS}" psql -X -q -h 127.0.0.1 -U "${DB_USER}" -d "${DB_NAME}" -tA -c 'SELECT 1' \
        >>"${LOG_FILE}" 2>&1 </dev/null; then
      ok "Database ${DB_NAME} is reachable as ${DB_USER} over 127.0.0.1."
      return 0
    fi
    sleep 1
  done
  fail "The panel database user cannot log in over 127.0.0.1. See ${LOG_FILE}"
}

setup_database() {
  step "4/8  Preparing database and secrets"
  prepare_secrets
  if ! provision_database; then
    fail "Creating the database or its user failed. See ${LOG_FILE}"
  fi
  ok "Database ${DB_NAME} and user ${DB_USER} are ready."
  configure_pg_auth
  verify_db_login
}

ensure_service_user() {
  if id -u "${SERVICE_USER}" >/dev/null 2>&1; then
    ok "System user ${SERVICE_USER} already exists."
  else
    local nologin
    nologin="$(command -v nologin 2>/dev/null || printf '/usr/sbin/nologin')"
    useradd --system --user-group --home-dir "${APP_DIR}" --no-create-home --shell "${nologin}" "${SERVICE_USER}"
    ok "Created system user ${SERVICE_USER} (no login shell)."
  fi
}

fetch_source() {
  step "5/8  Fetching the panel source"
  local staging src_root=""
  mkdir -p "$(dirname "${APP_DIR}")"
  staging="$(mktemp -d "${APP_DIR}.staging.XXXXXX")"

  if [[ -n "${LOCAL_SOURCE}" ]]; then
    tar -C "${LOCAL_SOURCE}" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./.env -cf - . \
      | tar -C "${staging}" -xf -
    src_root="$(resolve_project_root "${staging}" || true)"
    ok "Copied source from ${LOCAL_SOURCE}"
  else
    run_logged "git clone ${RABT_REPO}" \
      env GIT_TERMINAL_PROMPT=0 git clone --depth 1 --branch "${RABT_BRANCH}" "${RABT_REPO}" "${staging}/src"
    src_root="$(resolve_project_root "${staging}/src" || true)"
  fi

  if [[ -z "${src_root}" ]]; then
    rm -rf "${staging}"
    fail "package.json and src/ were not found in the source. Upload the extracted project files (not the ZIP) to GitHub."
  fi
  if [[ ! -f "${src_root}/package-lock.json" ]]; then
    warn "package-lock.json is missing; dependencies will be resolved with npm install (upload it to GitHub for reproducible installs)."
  fi

  if [[ -d /run/systemd/system ]] && systemctl is-active --quiet "${SERVICE_NAME}" 2>/dev/null; then
    systemctl stop "${SERVICE_NAME}" >>"${LOG_FILE}" 2>&1 || true
    ok "Stopped the running ${SERVICE_NAME} service for the upgrade."
  fi
  if [[ -e "${APP_DIR}" ]]; then
    rm -rf "${APP_DIR}.previous"
    mv "${APP_DIR}" "${APP_DIR}.previous"
  fi
  mv "${src_root}" "${APP_DIR}"
  rm -rf "${staging}"
  ok "Source installed in ${APP_DIR}"
}

write_env() {
  (
    umask 077
    cat >"${APP_DIR}/.env" <<EOF
# Generated by install.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ). Keep this file private.
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
SESSION_SECRET=${SESSION_SECRET_VALUE}
APP_PORT=${APP_PORT}
NEXT_TELEMETRY_DISABLED=1
EOF
  )
  chmod 600 "${APP_DIR}/.env"
  ok "Wrote ${APP_DIR}/.env (mode 600)."
}

build_app() {
  step "6/8  Installing dependencies and building (this can take a few minutes)"
  cd "${APP_DIR}"
  export NEXT_TELEMETRY_DISABLED=1 npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false
  if [[ -n "${NPM_REGISTRY}" ]]; then
    export npm_config_registry="${NPM_REGISTRY}"
    ok "Using npm registry ${NPM_REGISTRY}"
  fi
  if [[ -f package-lock.json ]]; then
    run_logged "npm ci" npm ci --include=dev
  else
    run_logged "npm install" npm install --include=dev
  fi
  run_logged "Apply database schema (drizzle-kit push)" ./node_modules/.bin/drizzle-kit push
  run_logged "next build" npm run build
}

write_unit() {
  local level="$1" node_bin hardening
  node_bin="$(command -v node)"
  hardening="NoNewPrivileges=true"
  if [[ "${level}" == "full" ]]; then
    hardening+=$'\nPrivateTmp=true\nProtectSystem=full\nProtectHome=true\nProtectKernelTunables=true'
    hardening+=$'\nProtectKernelModules=true\nProtectControlGroups=true\nRestrictSUIDSGID=true\nLockPersonality=true'
  fi
  cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Rabt private network panel
Documentation=https://github.com/Hosein21378/performance-server-tunneling
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
ExecStart=${node_bin} ${APP_DIR}/node_modules/next/dist/bin/next start -p ${APP_PORT} -H ${APP_HOST}
Restart=on-failure
RestartSec=5
${hardening}

[Install]
WantedBy=multi-user.target
EOF
}

start_without_systemd() {
  warn "systemd is not running; starting the panel in the background (it will NOT start again after a reboot)."
  local node_bin
  node_bin="$(command -v node)"
  pkill -f "next start -p ${APP_PORT} " >/dev/null 2>&1 || true
  (
    cd "${APP_DIR}"
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
    export NODE_ENV=production
    nohup runuser -u "${SERVICE_USER}" -- "${node_bin}" "${APP_DIR}/node_modules/next/dist/bin/next" start \
      -p "${APP_PORT}" -H "${APP_HOST}" >>/var/log/rabt-panel.log 2>&1 </dev/null &
  )
  wait_for_health || fail "The panel did not become healthy. Log: /var/log/rabt-panel.log"
  ok "Panel is running (log: /var/log/rabt-panel.log)."
}

start_service() {
  step "7/8  Starting the ${SERVICE_NAME} service"
  chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"
  chmod 750 "${APP_DIR}"
  chmod 600 "${APP_DIR}/.env"

  if [[ ! -d /run/systemd/system ]]; then
    start_without_systemd
    return 0
  fi
  if systemd-detect-virt --container --quiet 2>/dev/null; then
    HARDENING="minimal"
  fi
  write_unit "${HARDENING}"
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}" >>"${LOG_FILE}" 2>&1
  systemctl restart "${SERVICE_NAME}"
  if wait_for_health; then
    ok "Service ${SERVICE_NAME} is healthy (runs as ${SERVICE_USER}, sandboxing: ${HARDENING})."
    return 0
  fi
  if [[ "${HARDENING}" == "full" ]]; then
    warn "Not healthy with full sandboxing; retrying with minimal sandboxing (common on OpenVZ/LXC VPS)."
    HARDENING="minimal"
    write_unit minimal
    systemctl daemon-reload
    systemctl restart "${SERVICE_NAME}"
    if wait_for_health; then
      ok "Service ${SERVICE_NAME} is healthy (runs as ${SERVICE_USER}, sandboxing: minimal)."
      return 0
    fi
  fi
  journalctl -u "${SERVICE_NAME}" -n 40 --no-pager >&2 || true
  fail "The panel service did not become healthy. Logs: journalctl -u ${SERVICE_NAME} -n 100 --no-pager"
}

firewall_hint() {
  local ufw_status="" rule
  if command -v ufw >/dev/null 2>&1; then
    ufw_status="$(ufw status 2>/dev/null || true)"
  fi
  if [[ "${ufw_status}" == *"Status: active"* ]]; then
    printf '\n  ufw is active. Allow only your own IP, for example:\n'
    printf '    sudo ufw allow from YOUR.IP.ADDRESS to any port %s proto tcp\n' "${APP_PORT}"
  elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    rule="rule family=\"ipv4\" source address=\"YOUR.IP.ADDRESS\" port port=\"${APP_PORT}\" protocol=\"tcp\" accept"
    printf '\n  firewalld is active. Allow only your own IP, for example:\n'
    printf "    sudo firewall-cmd --permanent --add-rich-rule='%s' && sudo firewall-cmd --reload\n" "${rule}"
  fi
}

print_summary() {
  local ip url line="================================================================"
  if [[ "${APP_HOST}" == "0.0.0.0" || "${APP_HOST}" == "::" ]]; then
    ip="$(detect_public_ip)"
  else
    ip="${APP_HOST}"
  fi
  url="http://${ip}:${APP_PORT}"

  printf '\n%s%s%s\n' "${C_GREEN}" "${line}" "${C_RESET}"
  printf '  %sRabt panel is installed and running.%s\n' "${C_BOLD}" "${C_RESET}"
  printf '%s\n' "----------------------------------------------------------------"
  printf '  Panel URL : %s\n' "${url}"
  printf '  Password  : %s%s%s\n' "${C_BOLD}" "${ADMIN_PASSWORD}" "${C_RESET}"
  case "${PASSWORD_STATE}" in
    kept) printf '              (existing password kept)\n' ;;
    custom) printf '              (custom password from ADMIN_PASSWORD)\n' ;;
  esac
  if [[ "${APP_HOST}" == "127.0.0.1" ]]; then
    printf '  Local only: open it through an SSH tunnel from your computer:\n'
    printf '    ssh -L %s:127.0.0.1:%s root@SERVER_IP   then browse http://127.0.0.1:%s\n' "${APP_PORT}" "${APP_PORT}" "${APP_PORT}"
  fi
  printf '%s\n' "----------------------------------------------------------------"
  printf '  Show password : sudo grep ADMIN_PASSWORD %s/.env\n' "${APP_DIR}"
  printf '  Service       : systemctl status %s\n' "${SERVICE_NAME}"
  printf '  Service logs  : journalctl -u %s -n 50 --no-pager\n' "${SERVICE_NAME}"
  printf '  Install log   : %s\n' "${LOG_FILE}"
  firewall_hint
  printf '\n  Security notes:\n'
  printf '   - The panel uses plain HTTP; put it behind HTTPS and allow only your IP.\n'
  printf '   - Never commit .env, passwords or server keys to GitHub.\n'
  printf '   - Dashboard data is demo data; this version does not create real tunnels yet.\n'
  printf '%s%s%s\n' "${C_GREEN}" "${line}" "${C_RESET}"
}

main() {
  export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${PATH:+:${PATH}}"
  require_root
  validate_inputs
  init_log
  trap 'on_error ${LINENO}' ERR

  printf '%sRabt panel installer%s\n' "${C_BOLD}" "${C_RESET}"
  detect_local_source
  step "Pre-flight checks"
  detect_platform
  check_port

  install_prereqs
  install_node
  start_postgres
  setup_database
  ensure_service_user
  fetch_source
  write_env
  build_app
  start_service

  step "8/8  Finishing"
  rm -rf "${APP_DIR}.previous"
  ok "Cleaned up the previous release."
  print_summary
}

# Everything above only defines functions, so bash reads the whole script before
# running anything — safe for "curl ... | sudo bash".
if [[ "${RABT_NO_MAIN:-0}" != "1" ]]; then
  main "$@"
fi
