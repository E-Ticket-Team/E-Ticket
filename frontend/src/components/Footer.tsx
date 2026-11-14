import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <div className="footer-brand">Universal E-Ticketing Platform</div>
          <div>Event discovery, digital QR passes, and real-time gate validation.</div>
        </div>
        <div className="footer-links">
          <Link to="/events">Events</Link>
          <Link to="/tickets">Ticket Lookup</Link>
          <Link to="/scanner">Check-In Scanner</Link>
          <Link to="/organizer">Organizer Studio</Link>
          <Link to="/status">System Status</Link>
        </div>
      </div>
    </footer>
  );
}
