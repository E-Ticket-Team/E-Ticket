import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { authService } from '../services/auth.service';
import type { UserProfile } from '../types/api';
import { requestGoogleAccessToken } from '../utils/googleAuth';

interface StartGoogleAuthOptions {
  accountType?: 'CUSTOMER' | 'ORGANIZER';
  organizationName?: string;
}

export function useGoogleAuth() {
  const { googleLogin } = useAuth();
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';

  const [clientId, setClientId] = useState<string>(envClientId);
  const [configChecked, setConfigChecked] = useState(Boolean(envClientId));
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    let active = true;
    authService
      .getGoogleConfig()
      .then((cfg) => {
        if (!active) return;
        if (cfg.clientId) {
          setClientId(cfg.clientId);
        }
      })
      .catch(() => {
        // Keep envClientId fallback cleanly if config lookup fails.
      })
      .finally(() => {
        if (active) setConfigChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const startGoogleAuth = useCallback(
    async (options?: StartGoogleAuthOptions): Promise<UserProfile> => {
      setGoogleLoading(true);
      try {
        let resolvedClientId = clientId;
        if (!resolvedClientId) {
          try {
            const freshCfg = await authService.getGoogleConfig();
            if (freshCfg.clientId) {
              resolvedClientId = freshCfg.clientId;
              setClientId(freshCfg.clientId);
            }
          } catch {
            // Handled cleanly below when checking resolvedClientId.
          }
        }

        if (!resolvedClientId) {
          throw new Error(
            'Google Sign-In is not configured yet. Add your GOOGLE_CLIENT_ID to .env and restart the backend server.',
          );
        }

        const accessToken = await requestGoogleAccessToken(resolvedClientId);
        return await googleLogin({
          accessToken,
          accountType: options?.accountType,
          organizationName: options?.organizationName,
        });
      } finally {
        setGoogleLoading(false);
      }
    },
    [clientId, googleLogin],
  );

  return {
    googleEnabled: Boolean(clientId),
    configChecked,
    googleLoading,
    startGoogleAuth,
  };
}
