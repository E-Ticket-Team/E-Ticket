import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  QrCode,
  ShieldCheck,
  Ticket,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import type { HealthResponse } from '../types/api';
import { formatPersonName } from '../utils/format';

interface NavbarProps {
  health: HealthResponse | null;
  healthLoading: boolean;
}

export function Navbar({ health, healthLoading }: NavbarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isHealthy = health?.status === 'ok' && health?.database?.status === 'up';
  const pillClass = healthLoading
    ? 'health-pill'
    : isHealthy
      ? 'health-pill ok'
      : 'health-pill down';

  const statusLabel = healthLoading
    ? 'Checking API...'
    : isHealthy
      ? 'API Online'
      : 'API Offline';

  const canOrganize = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const canScan =
    user?.role === 'SCANNER' || user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const canBuy = isAuthenticated && user?.role !== 'SCANNER';

  async function handleLogout() {
    await logout();
    setDrawerOpen(false);
    showToast('You have been signed out.', { variant: 'info' });
    navigate('/');
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  const navItems = (
    <>
      <NavLink
        to="/events"
        onClick={closeDrawer}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        <CalendarDays size={16} />
        <span>Events</span>
      </NavLink>

      {canBuy && (
        <>
          <NavLink
            to="/my-tickets"
            onClick={closeDrawer}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Ticket size={16} />
            <span>My Tickets</span>
          </NavLink>
          <NavLink
            to="/my-account"
            onClick={closeDrawer}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <User size={16} />
            <span>Account</span>
          </NavLink>
        </>
      )}

      {canOrganize && (
        <NavLink
          to="/organizer"
          onClick={closeDrawer}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          <span>Organizer</span>
        </NavLink>
      )}

      {canScan && (
        <NavLink
          to="/scanner"
          onClick={closeDrawer}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <QrCode size={16} />
          <span>Scanner</span>
        </NavLink>
      )}

      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={closeDrawer}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ShieldCheck size={16} />
          <span>Admin</span>
        </NavLink>
      )}
    </>
  );

  return (
    <header className="navbar no-print">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={closeDrawer}>
          <span className="brand-mark">
            <Ticket size={20} />
          </span>
          <span>Universal E-Ticket</span>
        </Link>

        <nav className="nav-links nav-desktop" aria-label="Primary navigation">
          {navItems}
        </nav>

        <div className="nav-right">
          <Link to="/status" className={pillClass} title="View system & database health">
            <span className="status-dot" />
            <Activity size={14} />
            <span className="hide-xs">{statusLabel}</span>
          </Link>

          <div className="nav-auth-desktop">
            {isAuthenticated && user ? (
              <div className="user-menu">
                <div className="user-chip" title={user.email}>
                  <span className="user-chip-name">{formatPersonName(user)}</span>
                  <span className="badge badge-info">{user.role}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/login" className="btn btn-secondary btn-sm">
                  <LogIn size={14} />
                  <span>Sign In</span>
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  <UserPlus size={14} />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm mobile-menu-btn"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((o) => !o)}
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="mobile-drawer" role="dialog" aria-label="Mobile navigation">
          <div className="container mobile-drawer-inner">
            <nav className="mobile-nav-list" aria-label="Mobile navigation links">
              {navItems}
            </nav>

            <div className="mobile-drawer-footer">
              {isAuthenticated && user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="user-chip" style={{ justifyContent: 'space-between' }}>
                    <span className="user-chip-name">{formatPersonName(user)}</span>
                    <span className="badge badge-info">{user.role}</span>
                  </div>
                  <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Link to="/login" className="btn btn-secondary" onClick={closeDrawer}>
                    <LogIn size={15} />
                    <span>Sign In</span>
                  </Link>
                  <Link to="/register" className="btn btn-primary" onClick={closeDrawer}>
                    <UserPlus size={15} />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
