const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Sign-In is only available in the browser.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_GSI_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Sign-In script.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Unable to load Google Identity Services script.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export async function requestGoogleAccessToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Google OAuth2 client is unavailable in this browser.');
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description ||
                'Google Sign-In was cancelled or could not be completed.',
            ),
          );
          return;
        }
        if (!response.access_token) {
          reject(new Error('No Google access token was returned.'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (err) => {
        if (err.type === 'popup_closed') {
          reject(new Error('Google Sign-In popup was closed before finishing.'));
          return;
        }
        reject(
          new Error(
            err.message || 'Unable to open Google Sign-In popup. Check popup blocker settings.',
          ),
        );
      },
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
}
