#!/usr/bin/env bash
# Rabt server agent v1.0.0: enroll once, then report a heartbeat to the panel.
# This script does NOT install WireGuard, open ports, or configure a tunnel.
set -Eeuo pipefail

if [[ "${1:-}" == "--run" ]]; then
  : "${RABT_PANEL_URL:?RABT_PANEL_URL is required}"
  : "${RABT_AGENT_TOKEN:?RABT_AGENT_TOKEN is required}"
  while true; do
    if ! curl -fsS --connect-timeout 10 --max-time 20 \
      -H "Authorization: Bearer ${RABT_AGENT_TOKEN}" \
      -H 'Content-Type: application/json' \
      -d '{}' "${RABT_PANEL_URL}/api/agent/heartbeat" >/dev/null; then
      printf '[rabt-agent] heartbeat failed; will retry in 30 seconds\n' >&2
    fi
    sleep 30
  done
fi

fail() { printf '[rabt-agent] ERROR: %s\n' "$*" >&2; exit 1; }
[[ "${EUID}" -eq 0 ]] || fail 'Please run this installer with sudo or as root.'
command -v curl >/dev/null 2>&1 || fail 'curl is required.'
command -v systemctl >/dev/null 2>&1 || fail 'systemd is required.'
command -v useradd >/dev/null 2>&1 || fail 'useradd is required.'
systemctl is-system-running >/dev/null 2>&1 || [[ -d /run/systemd/system ]] || fail 'systemd is not running.'

PANEL="${RABT_PANEL_URL:-}"
TOKEN="${RABT_JOIN_TOKEN:-}"
[[ "${PANEL}" =~ ^https?://([A-Za-z0-9.-]+|\[[0-9a-fA-F:]+\])(:[0-9]{1,5})?$ ]] \
  || fail 'Invalid panel URL. Generate a new command from the panel.'
[[ "${TOKEN}" =~ ^[a-f0-9]{64}$ ]] || fail 'Invalid enrollment token. Generate a new command from the panel.'
if [[ "${PANEL}" == http://* ]]; then
  printf '[rabt-agent] WARNING: HTTP is unencrypted. Use HTTPS or a trusted private network.\n' >&2
fi

# Check that this host can create a dedicated low-privilege user before consuming
# the single-use token. The same user is reused on a reinstall.
if ! id -u rabt-agent >/dev/null 2>&1; then
  nologin="$(command -v nologin || printf '/usr/sbin/nologin')"
  useradd --system --user-group --no-create-home --home-dir /nonexistent --shell "${nologin}" rabt-agent
fi
install -d -m 0755 /usr/local/lib/rabt-agent
install -m 0755 "$0" /usr/local/lib/rabt-agent/agent.sh
install -d -m 0700 /etc/rabt-agent

HOST="$(hostname 2>/dev/null | LC_ALL=C tr -cd 'a-zA-Z0-9_.-' | cut -c1-253 || true)"
[[ -n "${HOST}" ]] || HOST="unknown"
printf '[rabt-agent] Connecting to %s ...\n' "${PANEL}"
response="$(curl -fsS --connect-timeout 10 --max-time 30 \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"${TOKEN}\",\"hostname\":\"${HOST}\"}" \
  "${PANEL}/api/agent/enroll")" || fail 'Enrollment failed. Check the panel URL, TLS, token expiry, and network access.'
AGENT_TOKEN="$(printf '%s' "${response}" | sed -n 's/.*"agentToken":"\([a-f0-9]\{64\}\)".*/\1/p')"
[[ "${AGENT_TOKEN}" =~ ^[a-f0-9]{64}$ ]] || fail 'Invalid enrollment response. Generate a new command in the panel.'
unset TOKEN RABT_JOIN_TOKEN response

umask 077
{
  printf 'RABT_PANEL_URL=%s\n' "${PANEL}"
  printf 'RABT_AGENT_TOKEN=%s\n' "${AGENT_TOKEN}"
} > /etc/rabt-agent/credentials.env
chmod 600 /etc/rabt-agent/credentials.env
unset AGENT_TOKEN

cat > /etc/systemd/system/rabt-agent.service <<'UNIT'
[Unit]
Description=Rabt panel heartbeat agent
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=rabt-agent
Group=rabt-agent
EnvironmentFile=/etc/rabt-agent/credentials.env
ExecStart=/usr/local/lib/rabt-agent/agent.sh --run
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
CapabilityBoundingSet=

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable rabt-agent.service >/dev/null
systemctl restart rabt-agent.service
sleep 2
systemctl is-active --quiet rabt-agent.service || fail 'Agent service failed. Check: journalctl -u rabt-agent -n 50 --no-pager'
printf '\n[rabt-agent] Connected. The panel should show this server online shortly.\n'
printf '[rabt-agent] Status: systemctl status rabt-agent\n'
printf '[rabt-agent] Logs:   journalctl -u rabt-agent -n 50 --no-pager\n'
printf '[rabt-agent] This agent does not create a WireGuard tunnel.\n'
