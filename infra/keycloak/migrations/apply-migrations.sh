#!/bin/sh
set -eu

MIGRATIONS_DIR="/opt/keycloak-data/migrations"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"

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
  if [ "$attempt" -ge 20 ]; then
    echo "Unable to authenticate to Keycloak after ${attempt} attempts."
    exit 1
  fi
  sleep 2
done

for migration in "${MIGRATIONS_DIR}"/*.realm.json; do
  realm=$(sed -n 's/.*"realm"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${migration}" | head -n 1)

  if [ -z "${realm}" ]; then
    echo "Skipping ${migration}: could not find top-level realm field."
    continue
  fi

  if /opt/keycloak/bin/kcadm.sh get "realms/${realm}" >/dev/null 2>&1; then
    echo "Updating realm ${realm} from migration $(basename "${migration}")"
    /opt/keycloak/bin/kcadm.sh update "realms/${realm}" -f "${migration}" >/dev/null
  else
    echo "Creating realm ${realm} from migration $(basename "${migration}")"
    /opt/keycloak/bin/kcadm.sh create realms -f "${migration}" >/dev/null
  fi
done

echo "Realm migrations applied successfully."
