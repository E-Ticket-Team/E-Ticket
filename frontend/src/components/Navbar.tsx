import { Link, NavLink } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  QrCode,
  Search,
  Ticket,
} from 'lucide-react';
import type { HealthResponse } from '../types/api';

interface NavbarProps {
  health: HealthResponse | null;
  healthLoading: boolean;
}

export function Navbar({ health, healthLoading }: NavbarProps) {
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

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Ticket size={20} />
          </span>
          <span>Universal E-Ticket</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink
            to="/events"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <CalendarDays size={16} />
            <span>Events</span>
          </NavLink>

          <NavLink
            to="/tickets"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Search size={16} />
            <span>Find Ticket</span>
          </NavLink>

          <NavLink
            to="/scanner"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <QrCode size={16} />
            <span>Check-In Scanner</span>
          </NavLink>

          <NavLink
            to="/organizer"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} />
            <span>Organizer</span>
          </NavLink>
        </nav>

        <div className="nav-right">
          <Link to="/status" className={pillClass} title="View system & database health">
            <span className="status-dot" />
            <Activity size={14} />
            <span>{statusLabel}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
