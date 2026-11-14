import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { api } from '../services/api';
import type { HealthResponse } from '../types/api';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function Layout() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const res = await api.getHealth();
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
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
