import { useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useGSAP } from '../animations/gsap';
import { runPageEntrance } from '../animations/page-animations';
import { useAuth } from '../hooks/useAuth';
import { AlertBanner } from './AlertBanner';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function Layout() {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const location = useLocation();
  const routeContainerRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      runPageEntrance(routeContainerRef.current);
    },
    { dependencies: [location.pathname], scope: routeContainerRef },
  );

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <div className="container">
          {sessionExpired && (
            <div style={{ marginBottom: 22 }}>
              <AlertBanner
                variant="warning"
                title="Session Expired"
                message="Your session has expired. Please sign in again to continue."
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <Link to="/login" className="btn btn-primary btn-sm" onClick={clearSessionExpired}>
                  Sign In Again
                </Link>
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearSessionExpired}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div ref={routeContainerRef}>
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
