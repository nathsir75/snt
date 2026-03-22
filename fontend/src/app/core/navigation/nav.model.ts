import { Role } from '../models/user.model';
import { NavBadgeCounts } from '../../shared/services/nav-badge.service';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  /**
   * If omitted, item is visible to ALL authenticated roles in this nav group.
   * Provide an array to restrict visibility to specific roles within the group.
   */
  roles?: Role[];
  group?: string;
  badge?: number;
  badgeColor?: 'warning' | 'danger' | 'info';
  /** Key into NavBadgeCounts — resolved at runtime by the shell. */
  badgeKey?: keyof NavBadgeCounts;
}
