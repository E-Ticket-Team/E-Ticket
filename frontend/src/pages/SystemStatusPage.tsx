import { useEffect, useState } from 'react';
import { Activity, Database, ExternalLink, RefreshCw, Server } from 'lucide-react';
import { ApiError, BASE_URL, healthApi } from '../services/api';
import type { HealthResponse } from '../types/api';
import { formatDateTime, formatUptime } from '../utils/format';
import { AlertBanner } from '../components/AlertBanner';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader } from '../components/common/PageHeader';

export function SystemStatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchHealth() {
    try {
      setLoading(true);
      const data = await healthApi.getHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setHealth(null);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to reach backend /health endpoint.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  const swaggerUrl = BASE_URL
    ? `${BASE_URL}/api/docs`
    : `${window.location.protocol}//${window.location.hostname}:4000/api/docs`;

  return (
    <div>
      <PageHeader
        title="System & API Status"
        subtitle="Live connectivity check for the NestJS REST API and PostgreSQL database."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={fetchHealth} disabled={loading}>
              <RefreshCw size={16} />
              <span>{loading ? 'Checking...' : 'Refresh Status'}</span>
            </button>
            <a href={swaggerUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
              <span>Open Swagger Docs</span>
              <ExternalLink size={15} />
            </a>
          </>
        }
      />

      {error && <AlertBanner variant="error" title="Health Check Failed" message={error} />}

      {health && (
        <div className="grid-2">
          <div className="card card-padded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Server size={20} color="var(--brand-primary)" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Backend API Service</h2>
              </div>
              <StatusBadge status={health.status} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Version</span>
                <strong>v{health.version}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Environment</span>
                <strong>{health.environment}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Uptime</span>
                <strong>{formatUptime(health.uptime)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Last Checked</span>
                <strong>{formatDateTime(health.timestamp)}</strong>
              </div>
            </div>
          </div>

          <div className="card card-padded">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={20} color="var(--brand-primary)" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>PostgreSQL Database</h2>
              </div>
              <StatusBadge status={health.database.status} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.92rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection Status</span>
                <strong style={{ textTransform: 'uppercase' }}>{health.database.status}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Query Latency</span>
                <strong>{health.database.latencyMs} ms</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Health Endpoint</span>
                <span className="code-chip" style={{ fontSize: '0.8rem' }}>
                  GET /health
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !health && !error && (
        <div className="card card-padded" style={{ textAlign: 'center' }}>
          <Activity size={24} />
          <p>No health data returned.</p>
        </div>
      )}
    </div>
  );
}
