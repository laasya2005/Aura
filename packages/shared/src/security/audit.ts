export interface AuditEntry {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export type AuditLogger = (entry: AuditEntry) => Promise<void>;

export function createAuditLogger(
  persistFn: (entry: AuditEntry & { createdAt: Date }) => Promise<void>
): AuditLogger {
  return async (entry: AuditEntry) => {
    const fullEntry = {
      ...entry,
      createdAt: new Date(),
    };

    // Always log to console in structured format
    console.log(
      JSON.stringify({
        level: "audit",
        ...fullEntry,
      })
    );

    // Persist to database (append-only)
    await persistFn(fullEntry);
  };
}

// Standard audit actions
export const AuditActions = {
  // Auth
  OTP_SENT: "auth.otp.sent",
  OTP_VERIFIED: "auth.otp.verified",
  OTP_FAILED: "auth.otp.failed",
  LOGIN: "auth.login",
  LOGOUT: "auth.logout",
  TOKEN_REFRESH: "auth.token.refresh",

  // User
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DELETED: "user.deleted",

  // Aura
  AURA_MODE_CHANGED: "aura.mode.changed",
  AURA_TUNED: "aura.tuned",

  // Goals
  GOAL_CREATED: "goal.created",
  GOAL_UPDATED: "goal.updated",
  GOAL_COMPLETED: "goal.completed",

  // Conversations
  MESSAGE_SENT: "conversation.message.sent",
  MESSAGE_RECEIVED: "conversation.message.received",

  // Subscriptions
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_UPDATED: "subscription.updated",
  SUBSCRIPTION_CANCELED: "subscription.canceled",

  // Consent
  CONSENT_GRANTED: "consent.granted",
  CONSENT_REVOKED: "consent.revoked",

  // Admin
  ADMIN_USER_VIEWED: "admin.user.viewed",
  ADMIN_CONVERSATION_REVIEWED: "admin.conversation.reviewed",
} as const;
