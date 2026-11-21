import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { Navbar } from '../components/Navbar';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { StatusBadge } from '../components/StatusBadge';
import { TicketPassCard } from '../components/TicketPassCard';
import { QuantitySelector } from '../components/tickets/QuantitySelector';
import { LoginPage } from '../pages/auth/LoginPage';
import type { TicketDetail, UserProfile } from '../types/api';

function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    loading: false,
    isAuthenticated: false,
    sessionExpired: false,
    login: vi.fn(),
    registerCustomer: vi.fn(),
    registerOrganization: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    clearSessionExpired: vi.fn(),
    ...overrides,
  };
}

const sampleCustomer: UserProfile = {
  id: 'u-cust',
  email: 'customer@eticket.com',
  firstName: 'Sophea',
  lastName: 'Sreng',
  role: 'CUSTOMER',
  isActive: true,
  createdAt: '2026-11-15T08:00:00Z',
  updatedAt: '2026-11-15T08:00:00Z',
};

const sampleOrganizer: UserProfile = {
  ...sampleCustomer,
  id: 'u-org',
  email: 'organizer@eticket.com',
  organizationName: 'Cambodia Tech Events Ltd.',
  role: 'ORGANIZER',
};

describe('Frontend Components & Role-Based UI', () => {
  it('enforces min/max bounds in QuantitySelector', () => {
    const onChange = vi.fn();
    render(<QuantitySelector value={1} min={0} max={2} onChange={onChange} label="VIP" />);

    fireEvent.click(screen.getByLabelText('Increase VIP'));
    expect(onChange).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByLabelText('Decrease VIP'));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('renders semantic status badges', () => {
    const { rerender } = render(<StatusBadge status="VALID" />);
    expect(screen.getByText('VALID')).toHaveClass('badge-success');

    rerender(<StatusBadge status="USED" />);
    expect(screen.getByText('USED')).toHaveClass('badge-warning');

    rerender(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText('CANCELLED')).toHaveClass('badge-danger');
  });

  it('renders role-aware links in Navbar', () => {
    const { rerender } = render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue()}>
          <MemoryRouter>
            <Navbar health={null} healthLoading={false} />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Organizer')).not.toBeInTheDocument();
    expect(screen.queryByText('Scanner')).not.toBeInTheDocument();

    rerender(
      <ToastProvider>
        <AuthContext.Provider
          value={makeAuthValue({ user: sampleOrganizer, isAuthenticated: true })}
        >
          <MemoryRouter>
            <Navbar health={null} healthLoading={false} />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByText('Organizer')).toBeInTheDocument();
    expect(screen.getByText('Scanner')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('blocks unauthorized role access in ProtectedRoute', () => {
    render(
      <AuthContext.Provider
        value={makeAuthValue({ user: sampleCustomer, isAuthenticated: true })}
      >
        <MemoryRouter initialEntries={['/organizer']}>
          <Routes>
            <Route
              path="/organizer"
              element={
                <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                  <div>Secret Organizer Studio</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.queryByText('Secret Organizer Studio')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login in ProtectedRoute', () => {
    render(
      <AuthContext.Provider value={makeAuthValue()}>
        <MemoryRouter initialEntries={['/my-tickets']}>
          <Routes>
            <Route
              path="/my-tickets"
              element={
                <ProtectedRoute>
                  <div>Private Wallet</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('renders TicketPassCard with QR code and ticket code', () => {
    const ticket: TicketDetail = {
      id: 't-1',
      orderId: 'o-1',
      ticketTypeId: 'tt-1',
      ticketCode: 'TKT-2026-VIP-001',
      qrPayload: 'ETK1.TKT-2026-VIP-001.signedhash',
      status: 'VALID',
      usedAt: null,
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
      ticketType: {
        id: 'tt-1',
        eventId: 'ev-1',
        name: 'VIP Pass',
        description: 'Front row',
        price: '99.00',
        totalQuantity: 100,
        remainingQuantity: 90,
        createdAt: '2026-11-15T08:00:00Z',
        updatedAt: '2026-11-15T08:00:00Z',
        event: {
          id: 'ev-1',
          title: 'Cambodia Tech Expo',
          description: 'Expo',
          category: 'Tech',
          venue: 'Koh Pich',
          location: 'Phnom Penh',
          bannerUrl: null,
          startDate: '2026-12-15T09:00:00Z',
          endDate: '2026-12-17T22:00:00Z',
          status: 'PUBLISHED',
          organizerId: 'u-org',
          createdAt: '2026-11-15T08:00:00Z',
          updatedAt: '2026-11-15T08:00:00Z',
        },
      },
    };

    render(
      <MemoryRouter>
        <TicketPassCard ticket={ticket} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cambodia Tech Expo')).toBeInTheDocument();
    expect(screen.getByText('TKT-2026-VIP-001')).toBeInTheDocument();
    expect(screen.getByText('VALID')).toBeInTheDocument();
  });

  it('submits credentials in LoginPage and toggles password visibility', async () => {
    const loginMock = vi.fn().mockResolvedValue(sampleCustomer);
    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue({ login: loginMock })}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/events" element={<div>Events Landing</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'customer@eticket.com' },
    });
    fireEvent.change(passwordInput, {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'customer@eticket.com',
        password: 'Password123!',
      });
    });
  });
});
