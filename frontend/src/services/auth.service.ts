import type { AuthResponse, GoogleAuthConfig, UserProfile } from '../types/api';
import { API_V1, apiRequest } from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleLoginPayload {
  credential?: string;
  accessToken?: string;
  accountType?: 'CUSTOMER' | 'ORGANIZER';
  organizationName?: string;
}

export interface RegisterCustomerPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface RegisterOrganizationPayload {
  email: string;
  password: string;
  organizationName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export const authService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`${API_V1}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedCallback: true,
    });
  },

  getGoogleConfig(): Promise<GoogleAuthConfig> {
    return apiRequest<GoogleAuthConfig>(`${API_V1}/auth/google/config`, {
      skipUnauthorizedCallback: true,
    });
  },

  googleLogin(payload: GoogleLoginPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`${API_V1}/auth/google`, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedCallback: true,
    });
  },

  registerCustomer(payload: RegisterCustomerPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`${API_V1}/auth/register/customer`, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedCallback: true,
    });
  },

  registerOrganization(payload: RegisterOrganizationPayload): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`${API_V1}/auth/register/organization`, {
      method: 'POST',
      body: JSON.stringify(payload),
      skipUnauthorizedCallback: true,
    });
  },

  logout(): Promise<{ loggedOut: boolean }> {
    return apiRequest<{ loggedOut: boolean }>(`${API_V1}/auth/logout`, {
      method: 'POST',
      skipUnauthorizedCallback: true,
    });
  },

  me(): Promise<UserProfile> {
    return apiRequest<UserProfile>(`${API_V1}/auth/me`, {
      skipUnauthorizedCallback: true,
    });
  },
};
