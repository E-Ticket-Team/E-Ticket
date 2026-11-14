import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  QrCode,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { TicketDetail } from '../types/api';
import { formatDateTime, SAMPLE_TICKET_CODE } from '../utils/format';
import { StatusBadge } from '../components/StatusBadge';
import { TicketPassCard } from '../components/TicketPassCard';

interface ScanHistoryEntry {
  id: string;
  ticketCode: string;
  outcome: 'VALIDATED' | 'CONFLICT' | 'ERROR';
  message: string;
  scannedAt: string;
}

interface BarcodeDetectorResult {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

export function ScannerPage() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') ?? '';

  const [ticketCode, setTicketCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [resultState, setResultState] = useState<{
    kind: 'success' | 'conflict' | 'error';
    title: string;
    message: string;
    ticket?: TicketDetail;
  } | null>(null);
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialCode) {
      setTicketCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError(null);
    const Detector = (
      window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    if (!Detector) {
      setCameraError(
        'Live QR camera scanning requires a browser supporting BarcodeDetector (e.g. Chrome/Edge). You can still type or use a USB barcode scanner below.',
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available in this browser context.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);

      const detector = new Detector({ formats: ['qr_code'] });

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);

      let busyDetecting = false;
      const scanLoop = async () => {
        if (!streamRef.current) return;
        if (videoRef.current && videoRef.current.readyState >= 2 && !busyDetecting) {
          busyDetecting = true;
          try {
            const barcodes = await detector.detect(videoRef.current);
            const raw = barcodes[0]?.rawValue?.trim();
            if (raw) {
              setTicketCode(raw);
              stopCamera();
              await runValidation(raw);
              return;
            }
          } catch {
            // Continue scanning frames
          } finally {
            busyDetecting = false;
          }
        }
        rafRef.current = window.requestAnimationFrame(scanLoop);
      };

      rafRef.current = window.requestAnimationFrame(scanLoop);
    } catch {
      setCameraError('Could not access camera. Please check browser camera permissions.');
      stopCamera();
    }
  }

  async function runValidation(rawCode: string) {
    const cleaned = rawCode.trim();
    if (!cleaned || submitting) return;

    setSubmitting(true);
    try {
      const res = await api.validateTicket(cleaned);
      setResultState({
        kind: 'success',
        title: 'Entry Approved — Ticket Checked In',
        message: res.message,
        ticket: res.ticket,
      });
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ticketCode: cleaned,
          outcome: 'VALIDATED',
          message: res.message,
          scannedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const isConflict = apiErr?.statusCode === 409;
      const message = apiErr?.message || 'Ticket validation failed.';
      setResultState({
        kind: isConflict ? 'conflict' : 'error',
        title: isConflict ? 'Duplicate Entry Blocked (Already Used)' : 'Validation Failed',
        message,
      });
      setHistory((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          ticketCode: cleaned,
          outcome: isConflict ? 'CONFLICT' : 'ERROR',
          message,
          scannedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    runValidation(ticketCode);
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h1 className="page-title">Gate Check-In Scanner</h1>
          <p className="page-subtitle">
            Verify digital tickets, mark passes as USED, and prevent duplicate entry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {cameraActive ? (
            <button type="button" className="btn btn-danger" onClick={stopCamera}>
              <CameraOff size={16} />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={startCamera}>
              <Camera size={16} />
              <span>Scan with Camera</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 24 }}>
        <div className="card card-padded">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <QrCode size={20} color="var(--brand-primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Verify Ticket Code</h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label htmlFor="scanner-code-input" className="input-label">
                Ticket Code (Manual or USB Scanner)
              </label>
              <input
                id="scanner-code-input"
                type="text"
                className="input"
                placeholder={`e.g. ${SAMPLE_TICKET_CODE}`}
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !ticketCode.trim()}
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Validating...' : 'Validate & Check In'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTicketCode(SAMPLE_TICKET_CODE)}
              >
                Fill Sample Code
              </button>

              {ticketCode.trim() && (
                <Link
                  to={`/tickets/${encodeURIComponent(ticketCode.trim())}`}
                  className="btn btn-secondary"
                >
                  Inspect Pass
                </Link>
              )}
            </div>
          </form>

          {cameraError && (
            <div className="alert alert-warning" style={{ marginTop: 16, marginBottom: 0 }}>
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.88rem' }}>{cameraError}</div>
            </div>
          )}

          {cameraActive && (
            <div
              style={{
                marginTop: 16,
                backgroundColor: '#0f172a',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-strong)',
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover' }}
              />
            </div>
          )}
        </div>

        <div className="card card-padded">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Session Check-In Log</h2>
            {history.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHistory([])}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: 20,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}
            >
              No tickets scanned in this session yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span className="code-chip" style={{ fontSize: '0.8rem' }}>
                      {item.ticketCode}
                    </span>
                    <StatusBadge
                      status={
                        item.outcome === 'VALIDATED'
                          ? 'VALID'
                          : item.outcome === 'CONFLICT'
                            ? 'USED'
                            : 'CANCELLED'
                      }
                    />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDateTime(item.scannedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {resultState && (
        <div style={{ marginTop: 8 }}>
          <div
            className={`alert ${
              resultState.kind === 'success'
                ? 'alert-success'
                : resultState.kind === 'conflict'
                  ? 'alert-warning'
                  : 'alert-error'
            }`}
          >
            {resultState.kind === 'success' ? (
              <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.02rem', marginBottom: 4 }}>
                {resultState.title}
              </div>
              <div style={{ fontSize: '0.94rem' }}>{resultState.message}</div>
            </div>
          </div>

          {resultState.ticket && (
            <TicketPassCard ticket={resultState.ticket} showValidateButton={false} />
          )}
        </div>
      )}
    </div>
  );
}
