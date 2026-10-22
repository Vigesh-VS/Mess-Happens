/**
 * Timestamps are Firestore `Timestamp`s at runtime. Models stay SDK-agnostic so the
 * same types serve the web client (firebase/firestore) and the Admin SDK scripts.
 */
export interface TimestampLike {
  toDate(): Date;
  toMillis(): number;
}

/** A mess date in the configured mess timezone, formatted yyyy-mm-dd. */
export type DateId = string;

export const DATE_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateId(value: string): value is DateId {
  return DATE_ID_PATTERN.test(value);
}
