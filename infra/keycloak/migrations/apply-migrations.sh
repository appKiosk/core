#!/bin/sh
set -eu

MIGRATIONS_DIR="/opt/keycloak-data/migrations"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD must be set}"
KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-${CORE_KEYCLOAK_CLIENT_SECRET:-}}"
DEFAULT_CLIENT_ID="${CORE_KEYCLOAK_CLIENT_ID:-core-local-gateway}"
KEYCLOAK_LOGIN_MAX_ATTEMPTS="${KEYCLOAK_LOGIN_MAX_ATTEMPTS:-30}"
KEYCLOAK_LOGIN_RETRY_DELAY_SECONDS="${KEYCLOAK_LOGIN_RETRY_DELAY_SECONDS:-2}"

extract_realm_from_filename() {
  migration_file_name="$1"
  realm_name=$(printf '%s' "${migration_file_name}" | sed -n 's/^[0-9][0-9][0-9]-\([a-z0-9-][a-z0-9-]*\)\.realm\.json$/\1/p')

  if [ -z "${realm_name}" ]; then
    echo ""
    return
  fi

  printf '%s' "${realm_name}"
}

extract_declared_realm() {
  migration_path="$1"
  sed -n 's/^[[:space:]]*"realm"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${migration_path}" | head -n 1
}

normalize_client_env_var_suffix() {
  client_id="$1"
  printf '%s' "${client_id}" | tr '[:lower:]-' '[:upper:]_' | sed 's/[^A-Z0-9_]/_/g'
}

resolve_active_client_secret() {
  client_id="$1"
  env_var_suffix=$(normalize_client_env_var_suffix "${client_id}")
  env_var_name="KEYCLOAK_CLIENT_SECRET_${env_var_suffix}"
  resolved_client_secret=$(printenv "${env_var_name}" || true)

  if [ -n "${resolved_client_secret}" ]; then
    printf '%s' "${resolved_client_secret}"
    return
  fi

  # Backwards compatibility for existing local setup that uses one default secret.
  if [ "${client_id}" = "${DEFAULT_CLIENT_ID}" ] && [ -n "${KEYCLOAK_CLIENT_SECRET}" ]; then
    printf '%s' "${KEYCLOAK_CLIENT_SECRET}"
    return
  fi

  printf ''
}

resolve_next_client_secret() {
  client_id="$1"
  env_var_suffix=$(normalize_client_env_var_suffix "${client_id}")
  env_var_name="KEYCLOAK_CLIENT_SECRET_NEXT_${env_var_suffix}"
  resolved_client_secret=$(printenv "${env_var_name}" || true)

  if [ -n "${resolved_client_secret}" ]; then
    printf '%s' "${resolved_client_secret}"
    return
  fi

  printf ''
}

set_client_secret() {
  realm_name="$1"
  client_id="$2"
  active_client_secret_value=$(resolve_active_client_secret "${client_id}")
  next_client_secret_value=$(resolve_next_client_secret "${client_id}")

  if [ -z "${active_client_secret_value}" ] && [ -z "${next_client_secret_value}" ]; then
    echo "No configured secret for ${client_id} in realm ${realm_name}; skipping secret update."
    return
  fi

  if [ -z "${active_client_secret_value}" ] && [ -n "${next_client_secret_value}" ]; then
    echo "Rotation secret configured without active secret for ${client_id} in realm ${realm_name}; skipping secret update."
    return
  fi

  if [ -n "${next_client_secret_value}" ] && [ "${active_client_secret_value}" = "${next_client_secret_value}" ]; then
    echo "Rotation secret matches active secret for ${client_id} in realm ${realm_name}; ignoring next secret value."
    next_client_secret_value=''
  fi

  client_internal_id=$(
    /opt/keycloak/bin/kcadm.sh get clients -r "${realm_name}" -q "clientId=${client_id}" \
      | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      | head -n 1
  )

  if [ -z "${client_internal_id}" ]; then
    echo "Could not find client ${client_id} in realm ${realm_name}; skipping secret update."
    return
  fi

  /opt/keycloak/bin/kcadm.sh create "clients/${client_internal_id}/client-secret" -r "${realm_name}" -s "value=${active_client_secret_value}" >/dev/null

  if [ -n "${next_client_secret_value}" ]; then
    /opt/keycloak/bin/kcadm.sh create "clients/${client_internal_id}/client-secret/rotated" -r "${realm_name}" -s "value=${next_client_secret_value}" >/dev/null
    echo "Configured overlap rotation secret for ${client_id} in realm ${realm_name}."
    return
  fi

  # Clear stale rotated secret when no overlap window is configured.
  /opt/keycloak/bin/kcadm.sh delete "clients/${client_internal_id}/client-secret/rotated" -r "${realm_name}" >/dev/null 2>&1 || true
}

set_client_secrets_for_realm() {
  realm_name="$1"
  client_ids=$(
    /opt/keycloak/bin/kcadm.sh get clients -r "${realm_name}" \
      | sed -n 's/.*"clientId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
  )

  if [ -z "${client_ids}" ]; then
    echo "No clients found in realm ${realm_name}; skipping secret updates."
    return
  fi

  printf '%s\n' "${client_ids}" | while IFS= read -r client_id; do
    if [ -z "${client_id}" ]; then
      continue
    fi

    case "${client_id}" in
      core-*) ;;
      *) continue ;;
    esac

    set_client_secret "${realm_name}" "${client_id}"
  done
}

delete_client_if_exists() {
  realm_name="$1"
  client_id="$2"

  client_internal_id=$(
    /opt/keycloak/bin/kcadm.sh get clients -r "${realm_name}" -q "clientId=${client_id}" \
      | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
      | head -n 1
  )

  if [ -z "${client_internal_id}" ]; then
    return
  fi

  /opt/keycloak/bin/kcadm.sh delete "clients/${client_internal_id}" -r "${realm_name}" >/dev/null
  echo "Removed deprecated client ${client_id} from realm ${realm_name}."
}

cleanup_deprecated_clients_for_realm() {
  realm_name="$1"

  case "${realm_name}" in
    core-users|core-services)
      delete_client_if_exists "${realm_name}" "core-local-dev"
      ;;
  esac
}

if ! ls "${MIGRATIONS_DIR}"/*.realm.json >/dev/null 2>&1; then
  echo "No realm migration files found in ${MIGRATIONS_DIR}."
  exit 0
fi

# Retry login to avoid races after the healthcheck reports ready.
attempt=0
until /opt/keycloak/bin/kcadm.sh config credentials \
  --server "${KEYCLOAK_URL}" \
  --realm master \
  --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}" >/dev/null 2>&1
 do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$KEYCLOAK_LOGIN_MAX_ATTEMPTS" ]; then
    echo "Unable to authenticate to Keycloak after ${attempt} attempts."
    exit 1
  fi
  sleep "$KEYCLOAK_LOGIN_RETRY_DELAY_SECONDS"
done

for migration in "${MIGRATIONS_DIR}"/*.realm.json; do
  migration_file_name=$(basename "${migration}")
  realm=$(extract_realm_from_filename "${migration_file_name}")

  if [ -z "${realm}" ]; then
    echo "Skipping ${migration}: filename must follow NNN-realm-name.realm.json."
    continue
  fi

  declared_realm=$(extract_declared_realm "${migration}")
  if [ -n "${declared_realm}" ] && [ "${declared_realm}" != "${realm}" ]; then
    echo "Skipping ${migration}: filename realm (${realm}) does not match declared realm (${declared_realm})."
    continue
  fi

  if /opt/keycloak/bin/kcadm.sh get "realms/${realm}" >/dev/null 2>&1; then
    echo "Updating realm ${realm} from migration ${migration_file_name}"
    /opt/keycloak/bin/kcadm.sh update "realms/${realm}" -f "${migration}" >/dev/null
  else
    echo "Creating realm ${realm} from migration ${migration_file_name}"
    /opt/keycloak/bin/kcadm.sh create realms -f "${migration}" >/dev/null
  fi

  # Realm update does not guarantee client reconciliation, so apply clients via partial import.
  /opt/keycloak/bin/kcadm.sh create partialImport -r "${realm}" -s ifResourceExists=OVERWRITE -f "${migration}" >/dev/null

  cleanup_deprecated_clients_for_realm "${realm}"
  set_client_secrets_for_realm "${realm}"
done

echo "Realm migrations applied successfully."
