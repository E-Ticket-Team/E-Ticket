import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { healthApi } from '../services/api';
import type { HealthResponse } from '../types/api';
import { AlertBanner } from './AlertBanner';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function Layout() {
  const { sessionExpired, clearSessionExpired } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const res = await healthApi.getHealth();
        if (active) setHealth(res);
      } catch {
        if (active) setHealth(null);
      } finally {
        if (active) setHealthLoading(false);
      }
    }

    checkHealth();
    const timer = window.setInterval(checkHealth, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="app-shell">
      <Navbar health={health} healthLoading={healthLoading} />
      <main className="main-content">
        <div className="container">
          {sessionExpired && (
            <div style={{ marginBottom: 20 }}>
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
          <div className="page-transition">
            <Outlet />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
