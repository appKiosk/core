export interface ServiceCredentialSecretInput {
  clientId: string;
}

export interface ServiceCredentialSecretPlanItem {
  clientId: string;
  activeSecretEnvVar: string;
  nextSecretEnvVar: string;
}

const CLIENT_ID_PATTERN = /^[a-z0-9-]+$/;

function normalizeClientId(clientId: string): string {
  return clientId.trim().toLowerCase();
}

function buildClientSecretSuffix(clientId: string): string {
  return normalizeClientId(clientId)
    .replace(/-/g, '_')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}

export function buildServiceCredentialSecretPlan(
  inputs: ServiceCredentialSecretInput[],
): ServiceCredentialSecretPlanItem[] {
  const seenClientIds = new Set<string>();

  return inputs.map((input) => {
    const normalizedClientId = normalizeClientId(input.clientId);

    if (!CLIENT_ID_PATTERN.test(normalizedClientId)) {
      throw new Error(
        `Invalid client id "${input.clientId}". Expected lowercase letters, numbers, and hyphens.`,
      );
    }

    if (seenClientIds.has(normalizedClientId)) {
      throw new Error(
        `Duplicate service credential client id detected: "${normalizedClientId}".`,
      );
    }

    seenClientIds.add(normalizedClientId);

    const suffix = buildClientSecretSuffix(normalizedClientId);

    return {
      clientId: normalizedClientId,
      activeSecretEnvVar: `KEYCLOAK_CLIENT_SECRET_${suffix}`,
      nextSecretEnvVar: `KEYCLOAK_CLIENT_SECRET_NEXT_${suffix}`,
    };
  });
}
