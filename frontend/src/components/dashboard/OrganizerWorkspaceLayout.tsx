import type { ReactNode } from 'react';
import {
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  PlusCircle,
  Receipt,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DashboardShellLayout,
  type DashboardNavItem,
} from './DashboardShellLayout';

interface OrganizerWorkspaceLayoutProps {
  pageTitle: string;
  headerActions?: ReactNode;
  notificationCount?: number;
  notificationTitle?: string;
  onNotificationClick?: () => void;
  pendingOrdersCount?: number;
  children: ReactNode;
}

export function OrganizerWorkspaceLayout({
  pageTitle,
  headerActions,
  notificationCount = 0,
  notificationTitle,
  onNotificationClick,
  pendingOrdersCount,
  children,
}: OrganizerWorkspaceLayoutProps) {
  const { user } = useAuth();

  const navItems: DashboardNavItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      to: '/organizer',
      end: true,
      icon: <LayoutDashboard size={17} />,
    },
    {
      id: 'orders',
      label: 'Ticket Sales',
      to: '/organizer/orders',
      icon: <Receipt size={17} />,
      badge: pendingOrdersCount && pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      id: 'events',
      label: 'My Events & Tiers',
      to: '/organizer/events',
      icon: <CalendarDays size={17} />,
    },
    {
      id: 'new-event',
      label: 'Create Event',
      to: '/organizer/events/new',
      icon: <PlusCircle size={17} />,
    },
  ];

  const secondaryNavItems: DashboardNavItem[] = [
    ...(user?.role === 'ADMIN'
      ? [
          {
            id: 'admin-console',
            label: 'Admin Console',
            to: '/admin',
            icon: <ShieldCheck size={17} />,
          },
        ]
      : []),
    {
      id: 'team',
      label: 'Team & Roles',
      to: '/organizer/team',
      icon: <UserPlus size={17} />,
    },
    {
      id: 'attendees',
      label: 'Attendees',
      to: '/organizer/attendees',
      icon: <Users size={17} />,
    },
    {
      id: 'check-ins',
      label: 'Check-Ins',
      to: '/organizer/check-ins',
      icon: <CheckSquare size={17} />,
    },
    {
      id: 'scanner',
      label: 'Gate Scanner',
      to: '/organizer/scanner',
      icon: <ScanLine size={17} />,
    },
  ];

  return (
    <DashboardShellLayout
      pageTitle={pageTitle}
      workspaceLabel="Organizer Studio"
      roleTitle={user?.role === 'ADMIN' ? 'Super Admin' : 'Event Organizer'}
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      headerActions={headerActions}
      notificationCount={notificationCount}
      notificationTitle={notificationTitle}
      onNotificationClick={onNotificationClick}
    >
      {children}
    </DashboardShellLayout>
  );
}
