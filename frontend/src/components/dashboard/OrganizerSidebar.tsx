import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Plus,
  Receipt,
  Users,
} from 'lucide-react';

export function OrganizerSidebar() {
  return (
    <aside className="dashboard-sidebar" aria-label="Organizer navigation">
      <div className="sidebar-group-title">Organizer Studio</div>
      <nav className="sidebar-nav">
        <NavLink
          to="/organizer"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={16} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/organizer/events"
          end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <CalendarDays size={16} />
          <span>My Events &amp; Tiers</span>
        </NavLink>

        <NavLink
          to="/organizer/events/new"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Plus size={16} />
          <span>Create Event</span>
        </NavLink>

        <NavLink
          to="/organizer/orders"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Receipt size={16} />
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/organizer/attendees"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Attendees</span>
        </NavLink>

        <NavLink
          to="/organizer/check-ins"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <CheckSquare size={16} />
          <span>Check-Ins</span>
        </NavLink>

        <NavLink
          to="/scanner"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <BarChart3 size={16} />
          <span>Gate Scanner</span>
        </NavLink>
      </nav>
    </aside>
  );
}
