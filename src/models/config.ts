import type { DateId, TimestampLike } from './common';
import type { Meal, Parity } from './menu';

/** `config/academicCalendar` — absent until an admin configures it. */
export interface AcademicCalendar {
  referenceDate: DateId;
  referenceParity: Parity;
  weekStartsOn: 'sunday' | 'monday';
  /** IANA zone used for every mess date, e.g. "Asia/Kolkata". */
  timezone: string;
  updatedAt: TimestampLike;
  updatedBy: string;
}

/** `config/menu` */
export interface MenuConfig {
  mealOrder: Meal[];
  /** choiceGroup id → human label. */
  choiceGroups: Record<string, string>;
  updatedAt: TimestampLike;
  updatedBy: string;
}

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
