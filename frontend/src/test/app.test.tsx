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
import { EventDetailPage } from '../pages/EventDetailPage';
import { HomePage } from '../pages/HomePage';
import { OrganizationLandingPage } from '../pages/OrganizationLandingPage';
import { OrganizerDashboardPage } from '../pages/organizer/OrganizerDashboardPage';
import { OrganizerTeamPage } from '../pages/organizer/OrganizerTeamPage';
import { ScannerPage } from '../pages/ScannerPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterCustomerPage } from '../pages/auth/RegisterCustomerPage';
import { RegisterOrganizationPage } from '../pages/auth/RegisterOrganizationPage';
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in';
import { adminService } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { eventsService } from '../services/events.service';
import { ordersService } from '../services/orders.service';
import { organizerService } from '../services/organizer.service';
import { ticketsService } from '../services/tickets.service';
import type {
  AdminOverviewData,
  EventItem,
  OrganizerDashboardData,
  TicketDetail,
  UserProfile,
} from '../types/api';

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
    expect(screen.queryByRole('link', { name: 'Discover' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('link', { name: 'Scanner' })).not.toBeInTheDocument();
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
      screen.queryByRole('link', { name: 'Gate Scanner' }),
    ).not.toBeInTheDocument();

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

  it('omits How It Works section from HomePage and displays it cleanly on OrganizationLandingPage', async () => {
    vi.spyOn(eventsService, 'list').mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 6, totalPages: 1 },
    });
    vi.spyOn(eventsService, 'getCategories').mockResolvedValue([]);

    const { unmount } = render(
      <AuthContext.Provider value={makeAuthValue()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/built for real venues/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/atomic seat reservation/i)).not.toBeInTheDocument();
    unmount();

    render(
      <AuthContext.Provider value={makeAuthValue()}>
        <MemoryRouter initialEntries={['/organization']}>
          <OrganizationLandingPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /create your first event/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/built for real venues, not spreadsheets/i)).toBeInTheDocument();
    expect(screen.getByText(/atomic seat reservation/i)).toBeInTheDocument();
    expect(screen.getByText('ETK1 · VERIFIED')).toBeInTheDocument();
  });

  it('allows guest buyers to reserve tickets without logging in from EventDetailPage', async () => {
    const sampleEvent: EventItem = {
      id: 'ev-guest-1',
      title: 'Mekong Sunset Electronic Night',
      description: 'Riverside night concert.',
      category: 'Music & Nightlife',
      venue: 'Chaktomuk Stage',
      location: 'Phnom Penh',
      bannerUrl: '/banners/mekong-music.jpg',
      startDate: '2026-12-22T17:00:00Z',
      endDate: '2026-12-22T23:30:00Z',
      status: 'PUBLISHED',
      organizerId: 'u-org',
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
    };
    const sampleTiers = [
      {
        id: 'tier-guest-1',
        eventId: 'ev-guest-1',
        name: 'Early Bird Pass',
        description: 'General access',
        price: '18.00',
        totalQuantity: 100,
        remainingQuantity: 50,
        createdAt: '2026-11-15T08:00:00Z',
        updatedAt: '2026-11-15T08:00:00Z',
      },
    ];

    vi.spyOn(eventsService, 'getById').mockResolvedValue(sampleEvent);
    vi.spyOn(ticketsService, 'getTypesByEvent').mockResolvedValue(sampleTiers);
    vi.spyOn(eventsService, 'list').mockResolvedValue({
      items: [sampleEvent],
      meta: { total: 1, page: 1, limit: 4, totalPages: 1 },
    });
    const createOrderSpy = vi.spyOn(ordersService, 'create').mockResolvedValue({
      id: 'ord-guest-99',
      userId: null,
      guestName: 'Dara Sok',
      guestEmail: 'dara@gmail.com',
      guestToken: 'tok-abc-123',
      totalAmount: '18.00',
      currency: 'USD',
      status: 'PENDING',
      paymentReference: null,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      paidAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue()}>
          <MemoryRouter initialEntries={['/events/ev-guest-1']}>
            <Routes>
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/checkout/:orderId" element={<div>Guest Checkout Destination</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Early Bird Pass')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Increase Early Bird Pass'));
    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Dara Sok' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'dara@gmail.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /buy tickets without login/i }));

    await waitFor(() => {
      expect(createOrderSpy).toHaveBeenCalledWith({
        items: [{ ticketTypeId: 'tier-guest-1', quantity: 1 }],
        guestName: 'Dara Sok',
        guestEmail: 'dara@gmail.com',
        guestPhone: undefined,
      });
    });

    expect(screen.getByText('Guest Checkout Destination')).toBeInTheDocument();
  });

  it('renders unified SaaS AdminDashboardPage with system KPIs, charts, Buyers List, All Events, and Users tabs', async () => {
    const sampleAdmin: UserProfile = {
      ...sampleCustomer,
      id: 'u-admin',
      email: 'admin@eticket.com',
      firstName: 'Dea',
      lastName: 'Jola',
      role: 'ADMIN',
    };

    const overviewData: AdminOverviewData = {
      users: {
        total: 42,
        byRole: { ADMIN: 1, ORGANIZER: 6, SCANNER: 4, CUSTOMER: 31 },
      },
      events: {
        total: 6,
        published: 5,
        draft: 1,
        cancelled: 0,
        completed: 0,
        totalCapacity: 1000,
        remainingCapacity: 259,
        soldCapacity: 741,
      },
      orders: {
        total: 24,
        paid: 20,
        pending: 2,
        cancelled: 1,
        refunded: 1,
        expired: 0,
        grossVolume: '2850.00',
        netVolume: '2750.00',
      },
      tickets: {
        totalIssued: 741,
        checkedIn: 312,
        valid: 429,
        cancelled: 4,
      },
      salesOverTime: [
        { date: '2026-11-20', paidOrders: 9, tickets: 38, revenue: '1250.00' },
        { date: '2026-11-21', paidOrders: 11, tickets: 44, revenue: '1500.00' },
      ],
    };

    const adminEvent: EventItem = {
      id: 'ev-adm-1',
      title: 'Cambodia Tech Expo 2026',
      description: 'Tech summit',
      category: 'Technology',
      venue: 'Koh Pich',
      location: 'Phnom Penh',
      bannerUrl: '/banners/tech-expo.jpg',
      startDate: '2026-12-15T09:00:00Z',
      endDate: '2026-12-17T22:00:00Z',
      status: 'PUBLISHED',
      organizerId: 'u-org',
      organizer: {
        id: 'u-org',
        email: 'organizer@eticket.com',
        firstName: null,
        lastName: null,
        organizationName: 'Cambodia Tech Events Ltd.',
      },
      createdAt: '2026-11-15T08:00:00Z',
      updatedAt: '2026-11-15T08:00:00Z',
      ticketTypes: [
        {
          id: 'tt-adm-1',
          eventId: 'ev-adm-1',
          name: 'VIP Pass',
          description: null,
          price: '45.00',
          totalQuantity: 200,
          remainingQuantity: 120,
          createdAt: '2026-11-15T08:00:00Z',
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ],
    };

    vi.spyOn(adminService, 'getOverview').mockResolvedValue(overviewData);
    vi.spyOn(adminService, 'listUsers').mockResolvedValue({
      items: [{ ...sampleOrganizer, _count: { events: 6, orders: 0 } }],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
    });
    vi.spyOn(adminService, 'listOrders').mockResolvedValue({
      items: [
        {
          id: 'ord-adm-1',
          userId: null,
          guestName: 'Stefanie Corn',
          guestEmail: 'stef233@exp.com',
          guestPhone: '0899932122',
          totalAmount: '90.00',
          currency: 'USD',
          status: 'PAID',
          paymentReference: 'TS9741',
          expiresAt: null,
          paidAt: '2026-11-21T09:32:00Z',
          cancelledAt: null,
          cancellationReason: null,
          createdAt: '2026-11-21T09:30:00Z',
          updatedAt: '2026-11-21T09:32:00Z',
          items: [
            {
              id: 'oi-1',
              orderId: 'ord-adm-1',
              ticketTypeId: 'tt-adm-1',
              quantity: 2,
              unitPrice: '45.00',
              subtotal: '90.00',
              ticketType: {
                id: 'tt-adm-1',
                eventId: 'ev-adm-1',
                name: 'VIP Ticket',
                description: null,
                price: '45.00',
                totalQuantity: 200,
                remainingQuantity: 120,
                createdAt: '2026-11-15T08:00:00Z',
                updatedAt: '2026-11-15T08:00:00Z',
                event: adminEvent,
              },
            },
          ],
        },
      ],
      meta: { total: 1, page: 1, limit: 8, totalPages: 1 },
    });
    vi.spyOn(adminService, 'listTickets').mockResolvedValue({
      items: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
    });
    vi.spyOn(eventsService, 'list').mockResolvedValue({
      items: [adminEvent],
      meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
    });

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue({ user: sampleAdmin, isAuthenticated: true })}>
          <MemoryRouter initialEntries={['/admin']}>
            <AdminDashboardPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByText('Admin Console')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('$2,750.00')).toBeInTheDocument();
    });

    expect(screen.getByRole('img', { name: 'Platform Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Platform Sales Analytics' })).toBeInTheDocument();
    expect(screen.getByText('Stefanie Corn')).toBeInTheDocument();
    expect(screen.getByText('0899932122')).toBeInTheDocument();
    expect(screen.getByText('TS9741')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^all events/i }));
    await waitFor(() => {
      expect(screen.getByText('Koh Pich')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Status for Cambodia Tech Expo 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^users & roles/i }));
    await waitFor(() => {
      expect(screen.getByLabelText('Role for organizer@eticket.com')).toBeInTheDocument();
    });
    expect(screen.getByText('Super Admin (Full System)')).toBeInTheDocument();
    const createUserSpy = vi.spyOn(adminService, 'createUser').mockResolvedValue({
      ...sampleOrganizer,
      id: 'u-created-1',
      email: 'newstaff@eticket.com',
      role: 'ORGANIZER',
    });
    fireEvent.click(screen.getByRole('button', { name: /add user & role/i }));
    fireEvent.change(screen.getByLabelText(/^email \*/i), {
      target: { value: 'newstaff@eticket.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password \*/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));
    await waitFor(() => {
      expect(createUserSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newstaff@eticket.com',
          password: 'Password123!',
          role: 'ORGANIZER',
        }),
      );
    });
  });

  it('renders unified SaaS OrganizerDashboardPage with organization metrics, charts, and searchable Buyers List', async () => {
    const dashData: OrganizerDashboardData = {
      summary: {
        totalEvents: 2,
        publishedEvents: 2,
        draftEvents: 0,
        grossRevenue: '1500.00',
        refundedAmount: '80.00',
        netRevenue: '1420.00',
        ticketsSold: 64,
        availableTickets: 136,
        totalCheckIns: 28,
        checkInRate: 43.8,
      },
      revenuePolicy: 'Net excludes refunds',
      salesOverTime: [
        { date: '2026-11-21', tickets: 18, revenue: '540.00' },
      ],
      eventBreakdown: [
        {
          eventId: 'ev-org-1',
          title: 'Mekong Sunset Night',
          status: 'PUBLISHED',
          startDate: '2026-12-22T17:00:00Z',
          venue: 'Chaktomuk Stage',
          totalCapacity: 200,
          remainingQuantity: 136,
          ticketsSold: 64,
          checkIns: 28,
          checkInRate: 43.8,
          grossRevenue: '1500.00',
          refundedAmount: '80.00',
          netRevenue: '1420.00',
        },
      ],
    };

    vi.spyOn(organizerService, 'getDashboard').mockResolvedValue(dashData);
    vi.spyOn(eventsService, 'list').mockResolvedValue({
      items: [
        {
          id: 'ev-org-1',
          title: 'Mekong Sunset Night',
          description: 'Music night',
          category: 'Music',
          venue: 'Chaktomuk Stage',
          location: 'Phnom Penh',
          bannerUrl: null,
          startDate: '2026-12-22T17:00:00Z',
          endDate: '2026-12-22T23:00:00Z',
          status: 'PUBLISHED',
          organizerId: 'u-org',
          createdAt: '2026-11-15T08:00:00Z',
          updatedAt: '2026-11-15T08:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
    vi.spyOn(organizerService, 'getOrders').mockResolvedValue([
      {
        id: 'ord-org-1',
        userId: null,
        guestName: 'Vannak Sok',
        guestEmail: 'vannak@gmail.com',
        guestPhone: '+855 12 888 999',
        totalAmount: '60.00',
        currency: 'USD',
        status: 'PAID',
        paymentReference: 'OR9001',
        expiresAt: null,
        paidAt: '2026-11-21T10:00:00Z',
        cancelledAt: null,
        cancellationReason: null,
        createdAt: '2026-11-21T09:58:00Z',
        updatedAt: '2026-11-21T10:00:00Z',
      },
      {
        id: 'ord-org-2',
        userId: 'u-cust',
        totalAmount: '30.00',
        currency: 'USD',
        status: 'PENDING',
        paymentReference: 'OR9002',
        expiresAt: null,
        paidAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: '2026-11-21T10:15:00Z',
        updatedAt: '2026-11-21T10:15:00Z',
        user: { id: 'u-cust', email: 'sophea@gmail.com', firstName: 'Sophea', lastName: 'Lim', phoneNumber: '099111222' },
      },
    ]);

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue({ user: sampleOrganizer, isAuthenticated: true })}>
          <MemoryRouter initialEntries={['/organizer']}>
            <OrganizerDashboardPage initialTab="overview" />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByText('Organizer Studio')).toBeInTheDocument();
    expect(screen.getByText('Event Organizer')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('$1,420.00')).toBeInTheDocument();
    });

    expect(screen.getByRole('img', { name: 'Total Ticket Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ticket Sales Analytics' })).toBeInTheDocument();
    expect(screen.getByText('+855 12 888 999')).toBeInTheDocument();
    expect(screen.getByText('Sophea Lim')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search Buyers List'), {
      target: { value: 'Vannak' },
    });
    expect(screen.getByText('Vannak Sok')).toBeInTheDocument();
    expect(screen.queryByText('Sophea Lim')).not.toBeInTheDocument();

    expect(
      screen.getByRole('region', { name: 'Organization Event Creation Studio' }),
    ).toBeInTheDocument();
    expect(screen.getByText('01. Create Event Page')).toBeInTheDocument();
    expect(screen.getByText('02. Ticket Tiers & Pricing')).toBeInTheDocument();
    expect(screen.getByText('03. Gate Staff & QR Entry')).toBeInTheDocument();
    expect(screen.getByText('04. Attendees & Check-Ins')).toBeInTheDocument();
  });

  it('provides 1-click Quick Role Access pills on LoginPage for all roles', async () => {
    vi.spyOn(authService, 'getGoogleConfig').mockResolvedValue({
      enabled: false,
      clientId: null,
    });
    const scannerUser: UserProfile = {
      ...sampleCustomer,
      id: 'u-scan',
      email: 'scanner@eticket.com',
      role: 'SCANNER',
    };
    const loginMock = vi.fn().mockResolvedValue(scannerUser);

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue({ login: loginMock })}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/scanner" element={<div>Gate Scanner Workspace</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByRole('button', { name: /use admin \(all roles\) account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use organizer account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use gate scanner account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use customer account/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /use gate scanner account/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'scanner@eticket.com',
        password: 'Password123!',
      });
    });

    expect(screen.getByText('Gate Scanner Workspace')).toBeInTheDocument();
  });

  it('renders ScannerPage cleanly inside OrganizerWorkspaceLayout scoped to created events', async () => {
    vi.spyOn(ticketsService, 'getScannerEvents').mockResolvedValue([
      {
        id: 'ev-owned-1',
        title: 'Cambodia Tech Expo 2026',
        venue: 'Diamond Island',
        location: 'Phnom Penh',
        startDate: '2026-12-15T09:00:00Z',
        endDate: '2026-12-17T22:00:00Z',
        status: 'PUBLISHED',
      },
    ]);

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue({ user: sampleOrganizer, isAuthenticated: true })}>
          <MemoryRouter initialEntries={['/organizer/scanner']}>
            <ScannerPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    expect(screen.getByText('Organizer Studio')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/scoped to your created events \(1\)/i),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('support@eticket.com.kh')).not.toBeInTheDocument();
  });

  it('renders OrganizerTeamPage with role capabilities and assigns staff to created events', async () => {
    vi.spyOn(eventsService, 'list').mockResolvedValue({
      items: [
        {
          id: 'ev-team-1',
          title: 'Cambodia Tech Expo 2026',
          description: 'Expo',
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
        },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    });
    vi.spyOn(organizerService, 'getTeamMembers').mockResolvedValue([]);
    const assignSpy = vi.spyOn(organizerService, 'assignTeamMember').mockResolvedValue({
      user: {
        id: 'u-staff-1',
        email: 'gate1@eticket.com',
        firstName: 'Dara',
        lastName: 'Sok',
        phoneNumber: null,
        role: 'SCANNER',
        isActive: true,
      },
      events: [
        {
          id: 'ev-team-1',
          title: 'Cambodia Tech Expo 2026',
          venue: 'Koh Pich',
          status: 'PUBLISHED',
          assignedAt: '2026-11-22T01:00:00Z',
        },
      ],
    });

    render(
      <ToastProvider>
        <AuthContext.Provider value={makeAuthValue({ user: sampleOrganizer, isAuthenticated: true })}>
          <MemoryRouter initialEntries={['/organizer/team']}>
            <OrganizerTeamPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Add Gate Staff & Assign Events')).toBeInTheDocument();
    });
    expect(screen.getByText('Organization Owner (ORGANIZER)')).toBeInTheDocument();
    expect(screen.getByText('Assigned Gate Staff (SCANNER)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/staff email/i), {
      target: { value: 'gate1@eticket.com' },
    });
    fireEvent.change(screen.getByLabelText(/initial password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add staff & grant gate scope/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'gate1@eticket.com',
          password: 'Password123!',
        }),
      );
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
