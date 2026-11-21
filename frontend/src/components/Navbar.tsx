import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { animatePanelEnter } from '../animations/transitions';
import { formatPersonName } from '../utils/format';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!drawerOpen) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';
    animatePanelEnter(drawerPanelRef.current);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const canOrganize = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
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
        Events
      </NavLink>

      <NavLink
        to="/organization"
        onClick={closeDrawer}
        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
      >
        For Business
      </NavLink>

      {canBuy && (
        <>
          <NavLink
            to="/my-tickets"
            onClick={closeDrawer}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            My Tickets
          </NavLink>
          <NavLink
            to="/my-account"
            onClick={closeDrawer}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Account
          </NavLink>
        </>
      )}

      {canOrganize && (
        <NavLink
          to="/organizer"
          onClick={closeDrawer}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          Organizer
        </NavLink>
      )}

      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={closeDrawer}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <>
      <header className={`navbar no-print ${scrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-inner">
          <Link to="/" className="brand" onClick={closeDrawer}>
            <span className="brand-mark" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
            </span>
            <span>Universal E-Ticket</span>
          </Link>

          <nav className="nav-links nav-desktop" aria-label="Primary navigation">
            {navItems}
          </nav>

          <div className="nav-right">
            <div className="nav-auth-desktop">
              {isAuthenticated && user ? (
                <div className="user-menu">
                  <div className="user-chip" title={user.email}>
                    <span className="user-chip-name">{formatPersonName(user)}</span>
                    <span className="badge badge-info">{user.role}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleLogout}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link to="/login" className="btn btn-ghost btn-sm">
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary btn-sm">
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-icon mobile-menu-btn"
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((o) => !o)}
            >
              {drawerOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div
          className="mobile-drawer-overlay no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          onClick={closeDrawer}
        >
          <div
            ref={drawerPanelRef}
            className="mobile-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <span className="meta-caption">Menu</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label="Close drawer"
                  onClick={closeDrawer}
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="mobile-nav-list" aria-label="Mobile navigation links">
                {navItems}
              </nav>
            </div>

            <div className="mobile-drawer-footer">
              {isAuthenticated && user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary" onClick={closeDrawer}>
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
