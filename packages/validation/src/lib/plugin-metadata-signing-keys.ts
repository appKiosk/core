import { generateKeyPairSync } from 'node:crypto';

export type PluginMetadataSigningAlgorithm = 'ed25519';

export interface PluginMetadataSigningKeyInput {
  keyId: string;
  algorithm?: string;
}

export interface PluginMetadataSigningKeyPlanItem {
  keyId: string;
  algorithm: PluginMetadataSigningAlgorithm;
  activePrivateKeyEnvVar: string;
  activePublicKeyEnvVar: string;
  nextPrivateKeyEnvVar: string;
  nextPublicKeyEnvVar: string;
}

export interface PluginMetadataSigningKeyPair {
  keyId: string;
  algorithm: PluginMetadataSigningAlgorithm;
  privateKeyPem: string;
  publicKeyPem: string;
}

const SIGNING_KEY_ID_PATTERN = /^[a-z0-9-]+$/;

function normalizeSigningKeyId(keyId: string): string {
  return keyId.trim().toLowerCase();
}

function buildSigningKeySuffix(keyId: string): string {
  return normalizeSigningKeyId(keyId)
    .replace(/-/g, '_')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}

function validateSigningKeyId(keyId: string): string {
  const normalizedKeyId = normalizeSigningKeyId(keyId);

  if (!SIGNING_KEY_ID_PATTERN.test(normalizedKeyId)) {
    throw new Error(
      `Invalid signing key id "${keyId}". Expected lowercase letters, numbers, and hyphens.`,
    );
  }

  return normalizedKeyId;
}

function validateAlgorithm(algorithm: string | undefined): PluginMetadataSigningAlgorithm {
  if (algorithm !== undefined && algorithm !== 'ed25519') {
    throw new Error(
      `Unsupported plugin metadata signing algorithm "${algorithm}". Only "ed25519" is supported.`,
    );
  }

  return 'ed25519';
}

export function buildPluginMetadataSigningKeyPlan(
  inputs: PluginMetadataSigningKeyInput[],
): PluginMetadataSigningKeyPlanItem[] {
  const seenKeyIds = new Set<string>();

  return inputs.map((input) => {
    const keyId = validateSigningKeyId(input.keyId);
    const algorithm = validateAlgorithm(input.algorithm);

    if (seenKeyIds.has(keyId)) {
      throw new Error(
        `Duplicate plugin metadata signing key id detected: "${keyId}".`,
      );
    }

    seenKeyIds.add(keyId);

    const suffix = buildSigningKeySuffix(keyId);

    return {
      keyId,
      algorithm,
      activePrivateKeyEnvVar: `PLUGIN_METADATA_SIGNING_PRIVATE_KEY_${suffix}`,
      activePublicKeyEnvVar: `PLUGIN_METADATA_SIGNING_PUBLIC_KEY_${suffix}`,
      nextPrivateKeyEnvVar: `PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_${suffix}`,
      nextPublicKeyEnvVar: `PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_${suffix}`,
    };
  });
}

export function generatePluginMetadataSigningKeyPair(
  input: PluginMetadataSigningKeyInput,
): PluginMetadataSigningKeyPair {
  const keyId = validateSigningKeyId(input.keyId);
  const algorithm = validateAlgorithm(input.algorithm);

  const { privateKey, publicKey } = generateKeyPairSync(algorithm);

  return {
    keyId,
    algorithm,
    privateKeyPem: privateKey
      .export({ type: 'pkcs8', format: 'pem' })
      .toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}
