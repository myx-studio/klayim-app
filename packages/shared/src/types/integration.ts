/**
 * Supported integration providers for OAuth connections
 */
export type IntegrationProvider =
  | "google_calendar"
  | "microsoft_calendar"
  | "bamboohr"
  | "finch"
  | "asana"
  | "clickup"
  | "linear";

/**
 * Integration connection status
 */
export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "refreshing";

/**
 * Encrypted OAuth credentials structure
 * All sensitive data is encrypted at rest using AES-256-GCM
 */
export interface EncryptedCredentials {
  ciphertext: string; // Base64 encoded encrypted token data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded GCM authentication tag
  salt: string; // Base64 encoded salt for key derivation
  keyVersion: number; // Encryption key version for rotation support
}

/**
 * Integration record for OAuth token storage
 * Each integration connects one provider account to one organization
 */
export interface Integration {
  id: string;
  organizationId: string; // Multi-tenant isolation key

  // Provider identification
  provider: IntegrationProvider;
  accountEmail: string; // For display and multi-account support
  accountId: string; // Provider's user/account ID

  // Connection state
  status: IntegrationStatus;
  scopes: string[]; // Granted OAuth scopes

  // Encrypted OAuth tokens (access + refresh)
  credentials: EncryptedCredentials;

  // Provider-specific webhook/subscription data
  webhookChannelId?: string; // For Google Calendar push notifications
  webhookSecret?: string; // For webhook signature verification (encrypted)
  subscriptionId?: string; // For Microsoft Graph subscriptions

  // Token lifecycle tracking
  expiresAt: string; // Token expiry ISO string
  lastUsedAt: string; // Last API call using this token
  lastRefreshedAt: string; // Last token refresh
  refreshCount: number; // Total refresh attempts

  // Error tracking
  lastError?: string; // Most recent error message

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
