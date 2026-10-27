import { CalendarDays, ChartPie, History, LogIn, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Signed in: Today · Summary · History · Profile (admin entry lives in Profile). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: UtensilsCrossed },
  { to: '/summary', label: 'Summary', icon: ChartPie },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

/** Admins also get the weekly Menu view. */
export const ADMIN_NAV_ITEMS: NavItem[] = [...NAV_ITEMS.slice(0, 3), { to: '/menu', label: 'Menu', icon: CalendarDays }, NAV_ITEMS[3]!];

/** Signed out: today's menu is public; tracking needs an account. */
export const GUEST_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: UtensilsCrossed },
  { to: '/login', label: 'Sign in', icon: LogIn },
];
