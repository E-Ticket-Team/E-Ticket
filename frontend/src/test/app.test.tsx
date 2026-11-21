import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { EventCard } from '../components/EventCard';
import { Footer } from '../components/Footer';
import { Layout } from '../components/Layout';
import { Navbar } from '../components/Navbar';
import { TextHoverEffect } from '@/components/ui/hover-footer';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { StatusBadge } from '../components/StatusBadge';
import { TicketPassCard } from '../components/TicketPassCard';
import { AnalyticsChart } from '../components/dashboard/AnalyticsChart';
import { QuantitySelector } from '../components/tickets/QuantitySelector';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterCustomerPage } from '../pages/auth/RegisterCustomerPage';
import { RegisterOrganizationPage } from '../pages/auth/RegisterOrganizationPage';
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in';
import { authService } from '../services/auth.service';
import { eventsService } from '../services/events.service';
import type { EventItem, TicketDetail, UserProfile } from '../types/api';

function makeAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    loading: false,
    isAuthenticated: false,
    sessionExpired: false,
    login: vi.fn(),
    googleLogin: vi.fn(),
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
            <Navbar />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.queryByText(/online|offline|checking/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /online|offline|checking/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Organizer')).not.toBeInTheDocument();
    expect(screen.queryByText('Scanner')).not.toBeInTheDocument();

    rerender(
      <ToastProvider>
        <AuthContext.Provider
          value={makeAuthValue({ user: sampleOrganizer, isAuthenticated: true })}
        >
          <MemoryRouter>
            <Navbar />
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

    fireEvent.click(screen.getByRole('button', { name: /view pass/i }));
    expect(
      screen.getByRole('dialog', { name: /full screen digital ticket pass/i }),
    ).toBeInTheDocument();
  });

  it('submits credentials in LoginPage and toggles password visibility', async () => {
    vi.spyOn(authService, 'getGoogleConfig').mockResolvedValue({
      enabled: false,
      clientId: null,
    });
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

  it('renders SignIn1 and shows clear config feedback on Google click when unconfigured', async () => {
    vi.spyOn(authService, 'getGoogleConfig').mockResolvedValue({
      enabled: false,
      clientId: null,
    });

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue()}>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/GOOGLE_CLIENT_ID/i);
    });

    render(<SignIn1 />);
    expect(screen.getAllByRole('button', { name: /continue with google/i }).length).toBe(2);
  });

  it('renders dark glass Sign Up pages with Google button', async () => {
    const getConfigSpy = vi.spyOn(authService, 'getGoogleConfig').mockResolvedValue({
      enabled: true,
      clientId: 'test-client-id.apps.googleusercontent.com',
    });

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue()}>
          <MemoryRouter>
            <RegisterCustomerPage />
            <RegisterOrganizationPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(
      screen.getByRole('heading', { name: /create customer account/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /register event organizer/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /continue with google/i }).length,
    ).toBe(2);

    await waitFor(() => {
      expect(getConfigSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('renders EventCard with date chip, category eyebrow, low-inventory badge, and ticket CTA', () => {
    const sampleEvent: EventItem = {
      id: 'ev-card-1',
      title: 'Phnom Penh Jazz Night',
      description: 'An intimate evening of live acoustic performances.',
      category: 'Music',
      venue: 'Chaktomuk Hall',
      location: 'Phnom Penh',
      bannerUrl: null,
      startDate: '2026-12-20T18:00:00Z',
      endDate: '2026-12-20T22:00:00Z',
      status: 'PUBLISHED',
      organizerId: 'u-org',
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
      ticketTypes: [
        {
          id: 'tt-jazz-1',
          eventId: 'ev-card-1',
          name: 'General',
          description: null,
          price: '35.00',
          totalQuantity: 50,
          remainingQuantity: 8,
          createdAt: '2026-11-15T08:00:00Z',
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ],
    };

    render(
      <MemoryRouter>
        <EventCard event={sampleEvent} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Phnom Penh Jazz Night')).toBeInTheDocument();
    expect(screen.getByText('Few Left')).toBeInTheDocument();
    expect(screen.getByText('From $35.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tickets/i })).toHaveAttribute(
      'href',
      '/events/ev-card-1',
    );
  });

  it('renders SVG bar chart and empty message in AnalyticsChart', () => {
    const { rerender } = render(
      <AnalyticsChart
        title="Revenue Over Time"
        subtitle="Daily settled ticket revenue"
        formatAsCurrency
        points={[
          { label: '2026-11-20', value: 120 },
          { label: '2026-11-21', value: 240 },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Revenue Over Time' })).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();

    rerender(
      <AnalyticsChart
        title="Revenue Over Time"
        points={[]}
        emptyMessage="No paid orders recorded yet."
      />,
    );
    expect(screen.getByText('No paid orders recorded yet.')).toBeInTheDocument();
  });

  it('renders HomePage spotlight event and categories from eventsService', async () => {
    const spotlight: EventItem = {
      id: 'ev-spot-1',
      title: 'Cambodia Tech Expo 2026',
      description: 'Annual summit.',
      category: 'Technology',
      venue: 'Koh Pich',
      location: 'Phnom Penh',
      bannerUrl: null,
      startDate: '2026-12-15T09:00:00Z',
      endDate: '2026-12-17T22:00:00Z',
      status: 'PUBLISHED',
      organizerId: 'u-org',
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
      ticketTypes: [
        {
          id: 'tt-spot-1',
          eventId: 'ev-spot-1',
          name: 'VIP Pass',
          description: null,
          price: '45.00',
          totalQuantity: 100,
          remainingQuantity: 42,
          createdAt: '2026-11-15T08:00:00Z',
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ],
    };

    const listSpy = vi.spyOn(eventsService, 'list').mockResolvedValue({
      items: [spotlight],
      meta: { total: 1, page: 1, limit: 6, totalPages: 1 },
    });
    const catSpy = vi
      .spyOn(eventsService, 'getCategories')
      .mockResolvedValue(['Technology', 'Music']);

    render(
      <AuthContext.Provider value={makeAuthValue()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: /discover moments/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Cambodia Tech Expo 2026').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute(
      'href',
      '/events?category=Music',
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Technology' })
        .some((el) => el.getAttribute('href') === '/events?category=Technology'),
    ).toBe(true);

    listSpy.mockRestore();
    catSpy.mockRestore();
  });

  it('renders Forest & Emerald Footer with interactive TextHoverEffect wordmark', () => {
    const { rerender } = render(
      <AuthContext.Provider value={makeAuthValue()}>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getAllByText('Universal E-Ticket').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('support@eticket.com.kh')).toBeInTheDocument();
    expect(screen.getAllByText('E-TICKET').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: 'Member Sign In' })).toHaveAttribute('href', '/login');

    rerender(
      <AuthContext.Provider
        value={makeAuthValue({ user: sampleOrganizer, isAuthenticated: true })}
      >
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      screen.getAllByRole('link', { name: 'Organizer Studio' })[0],
    ).toHaveAttribute('href', '/organizer');
    expect(
      screen.getAllByRole('link', { name: 'Gate Scanner' })[0],
    ).toHaveAttribute('href', '/scanner');

    render(<TextHoverEffect text="E-TICKET" />);
  });

  it('renders /login standalone without header Navbar or Footer and navigates Home into Layout', async () => {
    const getConfigSpy = vi.spyOn(authService, 'getGoogleConfig').mockResolvedValue({
      enabled: false,
      clientId: null,
    });

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue()}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterCustomerPage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<div>Landing Body</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getConfigSpy).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('link', { name: /home/i }));

    expect(screen.getByText('Landing Body')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
