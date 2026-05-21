#!/bin/sh
set -eu

MIGRATIONS_DIR="/opt/keycloak-data/migrations"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD must be set}"
KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-}"
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

set_client_secret() {
  realm_name="$1"
  client_id="core-local-dev"

  if [ -z "${KEYCLOAK_CLIENT_SECRET}" ]; then
    echo "KEYCLOAK_CLIENT_SECRET is not set; skipping secret update for ${client_id} in realm ${realm_name}."
    return
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

  /opt/keycloak/bin/kcadm.sh create "clients/${client_internal_id}/client-secret" -r "${realm_name}" -s "value=${KEYCLOAK_CLIENT_SECRET}" >/dev/null
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

  set_client_secret "${realm}"
done

echo "Realm migrations applied successfully."
