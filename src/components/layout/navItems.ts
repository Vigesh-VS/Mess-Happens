import { CalendarDays, ChartPie, History, LogIn, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Signed in: Today · Summary · History · Menu · Profile (admin entry lives in Profile). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: UtensilsCrossed },
  { to: '/summary', label: 'Summary', icon: ChartPie },
  { to: '/history', label: 'History', icon: History },
  { to: '/menu', label: 'Menu', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

/** Signed out: the menu is public; tracking needs an account. */
export const GUEST_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: UtensilsCrossed },
  { to: '/menu', label: 'Menu', icon: CalendarDays },
  { to: '/login', label: 'Sign in', icon: LogIn },
];
