import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, ShieldAlert } from 'lucide-react';

interface BarcodeDetectorResult {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

interface CameraScannerProps {
  onDetected: (payload: string) => void;
  disabled?: boolean;
}

export function CameraScanner({ onDetected, disabled = false }: CameraScannerProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decoderMode, setDecoderMode] = useState<'native' | 'jsqr' | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectedRef = useRef<{ code: string; at: number } | null>(null);

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
    setActive(false);
    setDecoderMode(null);
  }

  async function startCamera() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        'Camera access is unavailable in this browser or non-HTTPS context. Use manual or USB scanner entry below.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setActive(true);

      const NativeDetector = (
        window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
      ).BarcodeDetector;

      const detector = NativeDetector
        ? new NativeDetector({ formats: ['qr_code'] })
        : null;
      setDecoderMode(detector ? 'native' : 'jsqr');

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      let busy = false;
      const scanFrame = async () => {
        if (!streamRef.current) return;
        const video = videoRef.current;

        if (video && video.readyState >= 2 && video.videoWidth > 0 && !busy) {
          busy = true;
          try {
            let detectedValue: string | undefined;

            if (detector) {
              const codes = await detector.detect(video);
              detectedValue = codes[0]?.rawValue?.trim();
            } else {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas');
              }
              const canvas = canvasRef.current;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                  inversionAttempts: 'dontInvert',
                });
                detectedValue = qr?.data?.trim();
              }
            }

            if (detectedValue) {
              const now = Date.now();
              const prev = lastDetectedRef.current;
              // Cooldown prevents spamming the exact same frame back-to-back
              if (!prev || prev.code !== detectedValue || now - prev.at > 2000) {
                lastDetectedRef.current = { code: detectedValue, at: now };
                stopCamera();
                onDetected(detectedValue);
                return;
              }
            }
          } catch {
            // Continue next animation frame
          } finally {
            busy = false;
          }
        }

        rafRef.current = window.requestAnimationFrame(scanFrame);
      };

      rafRef.current = window.requestAnimationFrame(scanFrame);
    } catch {
      setError('Could not access camera. Please allow camera permission in your browser.');
      stopCamera();
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {active ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={stopCamera}
          >
            <CameraOff size={16} />
            <span>Stop Camera</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            onClick={startCamera}
          >
            <Camera size={16} />
            <span>Scan QR with Camera</span>
          </button>
        )}

        {active && decoderMode && (
          <span className="badge badge-info">
            Camera Active ({decoderMode === 'native' ? 'Native Detector' : 'jsQR Fallback'})
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-warning" style={{ marginTop: 14, marginBottom: 0 }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.88rem' }}>{error}</div>
        </div>
      )}

      {active && (
        <div className="camera-viewport">
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'cover' }}
          />
          <div className="camera-reticle" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
