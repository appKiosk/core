export type PluginId = string;
export type TenantId = string;
export type CoreEnvironment = 'local' | 'dev' | 'staging' | 'prod';
export type KeycloakRealmName = 'core-users' | 'core-services';

export type CoreServiceUseCase =
  | 'gateway'
  | 'registry'
  | 'policy'
  | 'plugin-admin';

export type ServiceCredentialSecretStage = 'active' | 'next';

export type PluginMetadataSigningKeyStage = 'active' | 'next';

export type PluginMetadataSigningKeyMaterial = 'private' | 'public';

export interface ServiceCredentialSecretReference {
  clientId: string;
  stage: ServiceCredentialSecretStage;
  envVarName: string;
}

export interface PluginMetadataSigningKeyReference {
  keyId: string;
  stage: PluginMetadataSigningKeyStage;
  privateKeyEnvVarName: string;
  publicKeyEnvVarName: string;
}

const CLIENT_ID_PATTERN = /^[a-z0-9-]+$/;

function normalizeClientId(clientId: string): string {
  return clientId.trim().toLowerCase();
}

export interface ApiErrorShape {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export class ContractsError extends Error implements ApiErrorShape {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ContractsError';
  }
}

export class ValidationContractsError extends ContractsError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationContractsError';
  }
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checkedAt: string;
  details?: Record<string, string>;
}

export interface PluginMetadata {
  pluginId: PluginId;
  displayName: string;
  version: string;
  owner: string;
  description?: string;
}

interface KeycloakClientProvisioningSpecBase {
  clientId: string;
  environment: CoreEnvironment;
}

interface HostShellClientProvisioningSpec extends KeycloakClientProvisioningSpecBase {
  realm: 'core-users';
  useCase: 'host-shell';
  flow: 'authorization_code_pkce';
  pluginId?: never;
}

interface CoreServiceClientProvisioningSpec extends KeycloakClientProvisioningSpecBase {
  realm: 'core-services';
  useCase: Exclude<CoreServiceUseCase, 'plugin-admin'>;
  flow: 'client_credentials';
  pluginId?: never;
}

interface PluginAdminClientProvisioningSpec extends KeycloakClientProvisioningSpecBase {
  realm: 'core-services';
  useCase: 'plugin-admin';
  flow: 'client_credentials';
  pluginId: PluginId;
}

export type KeycloakClientProvisioningSpec =
  | HostShellClientProvisioningSpec
  | CoreServiceClientProvisioningSpec
  | PluginAdminClientProvisioningSpec;

export function buildCoreUserClientId(environment: CoreEnvironment): string {
  return `core-${environment}-host-shell`;
}

export function buildCoreServiceClientId(
  environment: CoreEnvironment,
  useCase: Exclude<CoreServiceUseCase, 'plugin-admin'>,
): string {
  return `core-${environment}-${useCase}`;
}

export function buildPluginAdminClientId(
  environment: CoreEnvironment,
  pluginId: PluginId,
): string {
  const normalizedPluginId = normalizeClientId(pluginId);

  if (!CLIENT_ID_PATTERN.test(normalizedPluginId)) {
    throw new ValidationContractsError(
      'Plugin id must contain only lowercase letters, numbers, and hyphens.',
      { pluginId },
    );
  }

  return `core-${environment}-plugin-admin-${normalizedPluginId}`;
}

export function buildClientSecretEnvVarName(
  clientId: string,
  stage: ServiceCredentialSecretStage = 'active',
): string {
  const normalizedClientId = normalizeClientId(clientId);

  if (!CLIENT_ID_PATTERN.test(normalizedClientId)) {
    throw new ValidationContractsError(
      'Client id must contain only lowercase letters, numbers, and hyphens.',
      { clientId },
    );
  }

  const suffix = normalizedClientId
    .replace(/-/g, '_')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
  const prefix =
    stage === 'next'
      ? 'KEYCLOAK_CLIENT_SECRET_NEXT_'
      : 'KEYCLOAK_CLIENT_SECRET_';

  return `${prefix}${suffix}`;
}

export function buildServiceCredentialSecretReferences(
  clientId: string,
): ServiceCredentialSecretReference[] {
  const normalizedClientId = normalizeClientId(clientId);

  return [
    {
      clientId: normalizedClientId,
      stage: 'active',
      envVarName: buildClientSecretEnvVarName(normalizedClientId, 'active'),
    },
    {
      clientId: normalizedClientId,
      stage: 'next',
      envVarName: buildClientSecretEnvVarName(normalizedClientId, 'next'),
    },
  ];
}

export function buildPluginMetadataSigningKeyEnvVarName(
  keyId: string,
  material: PluginMetadataSigningKeyMaterial,
  stage: PluginMetadataSigningKeyStage = 'active',
): string {
  const normalizedKeyId = normalizeClientId(keyId);

  if (!CLIENT_ID_PATTERN.test(normalizedKeyId)) {
    throw new ValidationContractsError(
      'Signing key id must contain only letters, numbers, and hyphens.',
      { keyId },
    );
  }

  const suffix = normalizedKeyId
    .replace(/-/g, '_')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
  const prefix =
    material === 'private'
      ? stage === 'next'
        ? 'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_NEXT_'
        : 'PLUGIN_METADATA_SIGNING_PRIVATE_KEY_'
      : stage === 'next'
        ? 'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_NEXT_'
        : 'PLUGIN_METADATA_SIGNING_PUBLIC_KEY_';

  return `${prefix}${suffix}`;
}

export function buildPluginMetadataSigningKeyReferences(
  keyId: string,
): PluginMetadataSigningKeyReference[] {
  const normalizedKeyId = normalizeClientId(keyId);

  return [
    {
      keyId: normalizedKeyId,
      stage: 'active',
      privateKeyEnvVarName: buildPluginMetadataSigningKeyEnvVarName(
        normalizedKeyId,
        'private',
        'active',
      ),
      publicKeyEnvVarName: buildPluginMetadataSigningKeyEnvVarName(
        normalizedKeyId,
        'public',
        'active',
      ),
    },
    {
      keyId: normalizedKeyId,
      stage: 'next',
      privateKeyEnvVarName: buildPluginMetadataSigningKeyEnvVarName(
        normalizedKeyId,
        'private',
        'next',
      ),
      publicKeyEnvVarName: buildPluginMetadataSigningKeyEnvVarName(
        normalizedKeyId,
        'public',
        'next',
      ),
    },
  ];
}

export interface PluginRegistrationRequest {
  metadata: PluginMetadata;
  gatewayBaseUrl: string;
  healthEndpoint: string;
  permissions: string[];
  policies: string[];
}

export interface PluginRegistrationRecord extends PluginRegistrationRequest {
  tenantId: TenantId;
  registeredAt: string;
  updatedAt: string;
}

export interface EntitlementSubject {
  userId: string;
  tenantId: TenantId;
  roles: string[];
}

export interface EntitlementDecision {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
}

export interface PolicyEvaluationInput {
  tenantId: TenantId;
  subject: EntitlementSubject;
  action: string;
  resource: string;
  context?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  decision: EntitlementDecision;
  evaluatedAt: string;
}

export interface AuditEvent {
  eventId: string;
  eventType: string;
  tenantId: TenantId;
  actorId: string;
  occurredAt: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}
