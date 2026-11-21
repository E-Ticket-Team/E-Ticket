import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Compass,
  LogOut,
  Menu,
  Settings,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { formatPersonName } from '@/utils/format';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  to?: string;
  end?: boolean;
  active?: boolean;
  onClick?: () => void;
  badge?: number | string;
}

interface DashboardShellLayoutProps {
  pageTitle: string;
  workspaceLabel: string;
  roleTitle: string;
  navItems: DashboardNavItem[];
  secondaryNavItems?: DashboardNavItem[];
  headerActions?: ReactNode;
  notificationCount?: number;
  notificationTitle?: string;
  onNotificationClick?: () => void;
  children: ReactNode;
}

export function DashboardShellLayout({
  pageTitle,
  workspaceLabel,
  roleTitle,
  navItems,
  secondaryNavItems = [],
  headerActions,
  notificationCount = 0,
  notificationTitle,
  onNotificationClick,
  children,
}: DashboardShellLayoutProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    showToast('You have been signed out.', { variant: 'info' });
    navigate('/');
  }

  const displayName = formatPersonName(user);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ET';

  function renderNavList(items: DashboardNavItem[]) {
    return items.map((item) => {
      if (item.to) {
        return (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-colors ${
                isActive
                  ? 'bg-[#E7F5EE] text-[#087F5B] border border-[#D5EDE1]'
                  : 'text-[#53665E] hover:bg-[#F6F8F5] hover:text-[#052E25] border border-transparent'
              }`
            }
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </span>
            {item.badge !== undefined && item.badge !== 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#087F5B] text-white tabular-nums">
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      }

      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            setMobileOpen(false);
            item.onClick?.();
          }}
          className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-left transition-colors ${
            item.active
              ? 'bg-[#E7F5EE] text-[#087F5B] border border-[#D5EDE1]'
              : 'text-[#53665E] hover:bg-[#F6F8F5] hover:text-[#052E25] border border-transparent'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </span>
          {item.badge !== undefined && item.badge !== 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#087F5B] text-white tabular-nums">
              {item.badge}
            </span>
          )}
        </button>
      );
    });
  }

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Brand */}
        <div className="px-2 pt-1 pb-6 mb-4 border-b border-[#E3EBE5]">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#087F5B] text-white shadow-sm">
              <Ticket size={18} />
            </span>
            <div>
              <div className="text-[15px] font-extrabold text-[#052E25] tracking-tight leading-tight">
                Universal E-Ticket
              </div>
              <div className="text-[11px] font-semibold text-[#087F5B] uppercase tracking-wider">
                {workspaceLabel}
              </div>
            </div>
          </Link>
        </div>

        {/* GENERAL */}
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#82948B]">
          General
        </div>
        <nav className="flex flex-col gap-1" aria-label={`${workspaceLabel} navigation`}>
          {renderNavList(navItems)}
        </nav>

        {secondaryNavItems.length > 0 && (
          <>
            <div className="px-3 mt-6 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#82948B]">
              Operations
            </div>
            <nav className="flex flex-col gap-1">
              {renderNavList(secondaryNavItems)}
            </nav>
          </>
        )}
      </div>

      {/* OTHERS */}
      <div className="pt-4 mt-6 border-t border-[#E3EBE5]">
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-[#82948B]">
          Others
        </div>
        <nav className="flex flex-col gap-1">
          <Link
            to="/events"
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-[#53665E] hover:bg-[#F6F8F5] hover:text-[#052E25] transition-colors"
          >
            <Compass size={16} />
            <span>Public Events</span>
          </Link>
          <Link
            to="/my-account"
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-[#53665E] hover:bg-[#F6F8F5] hover:text-[#052E25] transition-colors"
          >
            <Settings size={16} />
            <span>Account Settings</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2] transition-colors text-left"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F5F8F6] flex">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-[252px] shrink-0 bg-white border-r border-[#E3EBE5] flex-col p-5 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#052E25]/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation drawer"
        >
          <div
            className="w-[272px] max-w-[85vw] h-full bg-white p-5 shadow-2xl overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close dashboard navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#53665E] hover:bg-[#F6F8F5]"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top White App Header */}
        <header className="h-[72px] bg-white border-b border-[#E3EBE5] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open dashboard menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#C8D6CD] bg-white text-[#052E25]"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-[#052E25] tracking-tight truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {headerActions}

            <button
              type="button"
              onClick={onNotificationClick}
              title={notificationTitle || 'Platform Notifications'}
              aria-label={notificationTitle || 'Platform Notifications'}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-[#E3EBE5] bg-[#FAFCFA] hover:bg-[#E7F5EE] text-[#102A21] transition"
            >
              <Bell size={16} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#087F5B] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-[#E3EBE5]">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover border border-[#C8D6CD]"
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-[#087F5B] text-white text-xs font-bold flex items-center justify-center">
                  {initials}
                </span>
              )}
              <div className="leading-tight">
                <div className="text-[13px] font-bold text-[#052E25] max-w-[140px] truncate">
                  {displayName}
                </div>
                <div className="text-[11px] font-medium text-[#64766D]">
                  {roleTitle}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
