export type IntegrationProvider = "kommo" | "asaas" | "anthropic" | "openai";

export type IntegrationEventEntity =
  | "lead"
  | "contact"
  | "company"
  | "task"
  | "payment"
  | "invoice"
  | "customer";

export interface IntegrationEventEnvelope {
  source: IntegrationProvider;
  eventType: string;
  entity: IntegrationEventEntity;
  entityId: string;
  occurredAt: string;
  receivedAt: string;
  requestId: string;
  eventHash: string;
  rawBody: unknown;
  normalized: Record<string, unknown>;
  metadata: {
    provider: IntegrationProvider;
    contentType?: string;
    signature?: string;
    deliveryId?: string;
  };
}

export interface IntegrationConfigRecord {
  id?: number;
  userId: number;
  provider: IntegrationProvider;
  clientId?: number | null;
  enabled: boolean;
  accountDomain?: string;
  apiBaseUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  webhookSecret?: string;
  webhookToken?: string;
  userAgent?: string;
  environment?: "sandbox" | "production";
  metadata?: Record<string, unknown> | null;
  updatedAt?: string;
}

export interface IntegrationPipelineSnapshot {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  dlq: number;
  lastProcessedAt?: string;
}
