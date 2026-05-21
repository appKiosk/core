export type PluginId = string;
export type TenantId = string;

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
