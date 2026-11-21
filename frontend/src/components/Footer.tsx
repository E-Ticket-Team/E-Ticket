import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Footer() {
  const { user, isAuthenticated } = useAuth();
  const canOrganize = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const canScan =
    user?.role === 'SCANNER' || user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  return (
    <footer className="footer no-print">
      <div className="container footer-inner">
        <div>
          <div className="footer-brand">Universal E-Ticketing Platform</div>
          <div>Event discovery, verified digital QR passes, and real-time gate validation.</div>
        </div>
        <div className="footer-links">
          <Link to="/events">Events</Link>
          {isAuthenticated && user?.role !== 'SCANNER' && (
            <Link to="/my-tickets">My Tickets</Link>
          )}
          {canOrganize && <Link to="/organizer">Organizer Studio</Link>}
          {canScan && <Link to="/scanner">Check-In Scanner</Link>}
          {!isAuthenticated && <Link to="/register/organization">Host Events</Link>}
          <Link to="/status">System Status</Link>
        </div>
      </div>
    </footer>
  );
}
