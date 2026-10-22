import { CalendarDays, ChartPie, History, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Today · Summary · History · Menu · Profile (admin entry lives in Profile). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Today', icon: UtensilsCrossed },
  { to: '/summary', label: 'Summary', icon: ChartPie },
  { to: '/history', label: 'History', icon: History },
  { to: '/menu', label: 'Menu', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: UserRound },
];
