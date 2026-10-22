import type { TimestampLike } from './common';

/** `adminAuditLogs/{autoId}` — create-only. */
export interface AdminAuditLog {
  actorUid: string;
  actorEmail: string | null;
  /** e.g. "food.update", "menu.update", "override.create". */
  action: string;
  target: { collection: string; id: string };
  before: unknown;
  after: unknown;
  at: TimestampLike;
}
